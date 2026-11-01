import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RankedVideo } from "@/lib/types";

vi.mock("@/lib/pipeline/queue", () => ({
  enqueue: vi.fn(async () => undefined),
  setInProcessQueueHandler: vi.fn(),
  getQueueAdapter: vi.fn(),
}));

import { enqueue } from "@/lib/pipeline/queue";
import { FairnessLimitError } from "@/lib/pipeline/limits";
import { getJobStore, resetMemoryJobStore } from "@/lib/pipeline/jobs";
import { retryQueueBuild } from "@/lib/pipeline/orchestrate";
import { RetryLaterError } from "@/lib/pipeline/retry";
import { retryOrDeadLetter } from "@/lib/pipeline/worker-support";
import { runKnowledgeBaseRetryJob } from "@/lib/services/kb-build-job";
import { getKnowledgeBase, saveKnowledgeBase } from "@/lib/store";

const videos: RankedVideo[] = [
  {
    videoId: "a",
    title: "A",
    channel: "Ch",
    url: "https://youtube.com/watch?v=a",
    thumbnailUrl: "",
    relevanceScore: 90,
    whyRelevant: "a",
    discussionLevel: "substantial",
  },
  {
    videoId: "b",
    title: "B",
    channel: "Ch",
    url: "https://youtube.com/watch?v=b",
    thumbnailUrl: "",
    relevanceScore: 80,
    whyRelevant: "b",
    discussionLevel: "brief",
  },
];

describe("retryQueueBuild", () => {
  beforeEach(async () => {
    resetMemoryJobStore();
    vi.clearAllMocks();
    process.env.PIPELINE_JOB_STORE = "memory";
    delete process.env.VERCEL;
    await saveKnowledgeBase({
      kbId: "kb-retry",
      topic: "t",
      userId: "user-1",
      videoIds: ["a", "b"],
      chunkIds: [],
      chunksIndexed: 0,
      videosIndexed: 0,
      totalMinutes: 0,
      status: "failed",
      createdAt: new Date().toISOString(),
      rankedVideos: videos,
      buildOptions: { transcriptMode: "captions" },
    });
    const store = getJobStore();
    await store.insertRun({
      kbId: "kb-retry",
      userId: "user-1",
      persistent: false,
      transcriptMode: "captions",
      videos,
    });
    await store.completeJob("kb-retry", "a", {
      status: "skipped",
      errorClass: "no_captions",
      message: "none",
    });
    await store.completeJob("kb-retry", "b", {
      status: "failed",
      errorClass: "unknown",
      message: "dlq",
    });
    await store.finishRun("kb-retry", "failed");
  });

  it("re-queues skipped and failed jobs", async () => {
    await retryQueueBuild(
      {
        kbId: "kb-retry",
        topic: "t",
        userId: "user-1",
        videoIds: ["a", "b"],
        chunkIds: [],
        chunksIndexed: 0,
        videosIndexed: 0,
        totalMinutes: 0,
        status: "failed",
        createdAt: new Date().toISOString(),
        rankedVideos: videos,
        buildOptions: { transcriptMode: "captions" },
      },
      false
    );

    const store = getJobStore();
    expect((await store.getJob("kb-retry", "a"))?.status).toBe("queued");
    expect((await store.getJob("kb-retry", "b"))?.status).toBe("queued");
    expect((await store.getRun("kb-retry"))?.status).toBe("building");
    expect(vi.mocked(enqueue)).toHaveBeenCalled();
    const sent = vi.mocked(enqueue).mock.calls.flatMap((call) => call[1]);
    expect(sent.map((message) => message.videoId).sort()).toEqual(["a", "b"]);
  });

  it("releases an in-progress job when the exclusive from-status misses", async () => {
    const store = getJobStore();
    await store.insertRun({
      kbId: "kb-release",
      userId: "user-1",
      persistent: false,
      transcriptMode: "captions",
      videos,
    });
    await store.claimJob("kb-release", "a", ["queued"], "fetching");
    await expect(
      retryOrDeadLetter({
        kbId: "kb-release",
        videoId: "a",
        userId: "user-1",
        receiveCount: 1,
        err: new Error("token empty"),
        releaseFrom: "embedding",
        releaseTo: "queued",
      })
    ).rejects.toBeInstanceOf(RetryLaterError);
    expect((await store.getJob("kb-release", "a"))?.status).toBe("queued");
  });

  it("leaves a failed KB failed when fairness rejects retry", async () => {
    const previousMax = process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS;
    const previousPipeline = process.env.KB_PIPELINE;
    process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS = "2";
    process.env.KB_PIPELINE = "queue";
    try {
      const store = getJobStore();
      await store.insertRun({
        kbId: "kb-active-a",
        userId: "user-1",
        persistent: false,
        transcriptMode: "captions",
        videos,
      });
      await store.insertRun({
        kbId: "kb-active-b",
        userId: "user-1",
        persistent: false,
        transcriptMode: "captions",
        videos,
      });

      await expect(runKnowledgeBaseRetryJob("kb-retry", "user-1", false)).rejects.toBeInstanceOf(
        FairnessLimitError
      );
      expect((await getKnowledgeBase("kb-retry"))?.status).toBe("failed");
      expect((await store.getJob("kb-retry", "a"))?.status).toBe("skipped");
      expect((await store.getRun("kb-retry"))?.status).toBe("failed");
      expect(vi.mocked(enqueue)).not.toHaveBeenCalled();
    } finally {
      if (previousMax === undefined) delete process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS;
      else process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS = previousMax;
      if (previousPipeline === undefined) delete process.env.KB_PIPELINE;
      else process.env.KB_PIPELINE = previousPipeline;
    }
  });

  it("enforces fairness when retrying a KB with no job run", async () => {
    const previousMax = process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS;
    process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS = "2";
    try {
      const store = getJobStore();
      await store.insertRun({
        kbId: "kb-active-a",
        userId: "user-1",
        persistent: false,
        transcriptMode: "captions",
        videos,
      });
      await store.insertRun({
        kbId: "kb-active-b",
        userId: "user-1",
        persistent: false,
        transcriptMode: "captions",
        videos,
      });
      await saveKnowledgeBase({
        kbId: "kb-orphan",
        topic: "t",
        userId: "user-1",
        videoIds: ["a", "b"],
        chunkIds: [],
        chunksIndexed: 0,
        videosIndexed: 0,
        totalMinutes: 0,
        status: "failed",
        createdAt: new Date().toISOString(),
        rankedVideos: videos,
        buildOptions: { transcriptMode: "captions" },
      });

      await expect(
        retryQueueBuild(
          {
            kbId: "kb-orphan",
            topic: "t",
            userId: "user-1",
            videoIds: ["a", "b"],
            chunkIds: [],
            chunksIndexed: 0,
            videosIndexed: 0,
            totalMinutes: 0,
            status: "failed",
            createdAt: new Date().toISOString(),
            rankedVideos: videos,
            buildOptions: { transcriptMode: "captions" },
          },
          false
        )
      ).rejects.toBeInstanceOf(FairnessLimitError);
      expect((await getKnowledgeBase("kb-orphan"))?.status).toBe("failed");
      expect(await store.getRun("kb-orphan")).toBeNull();
      expect(vi.mocked(enqueue)).not.toHaveBeenCalled();
    } finally {
      if (previousMax === undefined) delete process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS;
      else process.env.PIPELINE_USER_MAX_ACTIVE_BUILDS = previousMax;
    }
  });
});
