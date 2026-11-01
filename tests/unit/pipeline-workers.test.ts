import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RankedVideo } from "@/lib/types";

vi.mock("@/lib/services/transcript", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/transcript")>();
  return {
    ...actual,
    getTranscript: vi.fn(),
    getTranscriptDurationMinutes: () => 2,
  };
});

vi.mock("@/lib/services/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/llm")>();
  return {
    ...actual,
    generateEmbeddings: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
    isRetryableLlmError: actual.isRetryableLlmError,
  };
});

vi.mock("@/lib/store/vector-index", () => ({
  addToKbVectorIndex: vi.fn(async () => undefined),
}));

vi.mock("@/lib/services/kb-chat", () => ({
  ensureKbWelcomeMessage: vi.fn(async () => []),
  refreshKbWelcomeMessage: vi.fn(async () => undefined),
}));

vi.mock("@/lib/pipeline/queue", () => ({
  enqueue: vi.fn(async () => undefined),
  setInProcessQueueHandler: vi.fn(),
  getQueueAdapter: vi.fn(),
}));

vi.mock("@/lib/pipeline/limits", () => ({
  takeYoutubeFetchToken: vi.fn(async () => undefined),
  recordYoutubeBlock: vi.fn(async () => undefined),
  remainingFetchSlots: vi.fn(async () => 8),
  assertCanStartBuild: vi.fn(async () => undefined),
  FairnessLimitError: class FairnessLimitError extends Error {},
  YoutubeTokenUnavailableError: class YoutubeTokenUnavailableError extends Error {},
  YoutubeCircuitOpenError: class YoutubeCircuitOpenError extends Error {},
}));

import { getTranscript, TranscriptUnavailableError } from "@/lib/services/transcript";
import { generateEmbeddings } from "@/lib/services/llm";
import { handleFetchJob } from "@/lib/pipeline/fetch-worker";
import { handleEmbedJob } from "@/lib/pipeline/embed-worker";
import { getJobStore, resetMemoryJobStore } from "@/lib/pipeline/jobs";
import { RetryLaterError } from "@/lib/pipeline/retry";
import { getKnowledgeBase, saveKnowledgeBase } from "@/lib/store";

const video: RankedVideo = {
  videoId: "vid-1",
  title: "Talk",
  channel: "Conf",
  url: "https://youtube.com/watch?v=vid-1",
  thumbnailUrl: "",
  relevanceScore: 90,
  whyRelevant: "relevant",
  discussionLevel: "substantial",
};

describe("pipeline workers", () => {
  beforeEach(async () => {
    resetMemoryJobStore();
    vi.clearAllMocks();
    await saveKnowledgeBase({
      kbId: "kb-w",
      topic: "t",
      userId: "user-1",
      videoIds: ["vid-1"],
      chunkIds: [],
      chunksIndexed: 0,
      videosIndexed: 0,
      totalMinutes: 0,
      status: "building",
      createdAt: new Date().toISOString(),
      rankedVideos: [video],
      buildOptions: { transcriptMode: "captions" },
    });
    await getJobStore().insertRun({
      kbId: "kb-w",
      userId: "user-1",
      persistent: false,
      transcriptMode: "captions",
      videos: [video],
    });
  });

  it("skips videos with no captions and completes the run", async () => {
    vi.mocked(getTranscript).mockRejectedValueOnce(
      new TranscriptUnavailableError("vid-1", new Error("No transcript is available for this video"))
    );

    await handleFetchJob({ kbId: "kb-w", videoId: "vid-1" }, 1);

    const job = await getJobStore().getJob("kb-w", "vid-1");
    expect(job?.status).toBe("skipped");
    expect(job?.errorClass).toBe("no_captions");
    expect((await getKnowledgeBase("kb-w"))?.status).toBe("failed");
  });

  it("retries blocked fetches instead of sleeping", async () => {
    vi.mocked(getTranscript).mockRejectedValueOnce(
      new TranscriptUnavailableError("vid-1", new Error("Sign in to confirm you’re not a bot"))
    );

    await expect(handleFetchJob({ kbId: "kb-w", videoId: "vid-1" }, 1)).rejects.toBeInstanceOf(
      RetryLaterError
    );
    expect((await getJobStore().getJob("kb-w", "vid-1"))?.status).toBe("fetching");
  });

  it("does not embed twice when the fetch+embed pair is delivered again", async () => {
    vi.mocked(getTranscript).mockResolvedValue({
      videoId: "vid-1",
      language: "en",
      segments: [{ start: 0, duration: 2, text: "hello world ".repeat(40) }],
    });

    await handleFetchJob({ kbId: "kb-w", videoId: "vid-1" }, 1);
    await handleEmbedJob({ kbId: "kb-w", videoId: "vid-1" }, 1);
    await handleFetchJob({ kbId: "kb-w", videoId: "vid-1" }, 2);
    await handleEmbedJob({ kbId: "kb-w", videoId: "vid-1" }, 2);

    expect(vi.mocked(generateEmbeddings).mock.calls.length).toBe(1);
    expect((await getJobStore().getJob("kb-w", "vid-1"))?.status).toBe("indexed");
    expect((await getKnowledgeBase("kb-w"))?.status).toBe("ready");
  });
});
