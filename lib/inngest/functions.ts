import {
  inngest,
  kbBuildRequestedEvent,
  kbBuildVideoEvent,
} from "@/lib/inngest/client";
import { captureException } from "@/lib/observe";
import { getJobStore, TERMINAL_JOB_STATUSES } from "@/lib/pipeline/jobs";
import {
  applyVideoBuildResultToKb,
  completeKnowledgeBaseBuild,
  embedPersistedVideoChunks,
  failKnowledgeBaseBuild,
  failedVideoBuildResult,
  fetchVideoTranscriptForBuild,
  KB_BUILD_VIDEO_CONCURRENCY,
  KB_BUILD_VIDEO_RETRIES,
  loadBuildVideo,
  loadPendingBuildVideos,
  markVideoBuildSkipped,
  persistVideoChunksForBuild,
  reuseIndexedVideoIfPresent,
  writeVideoIndexForBuild,
  type VideoBuildResult,
} from "@/lib/services/kb-build-steps";
import { writeKbBuildHeartbeat } from "@/lib/services/kb-build-lock";
import { getKnowledgeBase } from "@/lib/store";

function originalBuildEvent(event: {
  data?: { event?: { data?: { kbId?: string; persistent?: boolean } } };
}) {
  return event.data?.event?.data;
}

export const kbBuildVideo = inngest.createFunction(
  {
    id: "kb-build-video",
    retries: KB_BUILD_VIDEO_RETRIES,
    concurrency: { limit: KB_BUILD_VIDEO_CONCURRENCY },
    timeouts: { finish: "10m" },
    triggers: [kbBuildVideoEvent],
  },
  async ({ event, step }): Promise<VideoBuildResult> => {
    const { kbId, videoId, persistent } = event.data;
    if (!(await getKnowledgeBase(kbId))) {
      return {
        videoId,
        title: videoId,
        status: "skipped",
        error: "Knowledge base deleted",
        chunkIds: [],
        minutes: 0,
      } satisfies VideoBuildResult;
    }
    await writeKbBuildHeartbeat(kbId);

    const existingJob = await getJobStore().getJob(kbId, videoId);
    if (existingJob && TERMINAL_JOB_STATUSES.includes(existingJob.status)) {
      return {
        videoId,
        title: existingJob.title,
        status: existingJob.status === "indexed" ? "indexed" : existingJob.status === "skipped" ? "skipped" : "failed",
        error: existingJob.errorMessage ?? undefined,
        chunkIds: existingJob.chunkIds,
        minutes: existingJob.minutes,
      } satisfies VideoBuildResult;
    }
    await getJobStore().claimJob(
      kbId,
      videoId,
      ["queued", "fetched", "fetching", "embedding"],
      "fetching"
    );

    const reused = await step.run("reuse-indexed", async () => {
      const { video } = await loadBuildVideo(kbId, videoId);
      return reuseIndexedVideoIfPresent(kbId, video);
    });
    if (reused) {
      return step.run("index-reused", () =>
        writeVideoIndexForBuild(
          kbId,
          videoId,
          persistent,
          reused.chunkIds ?? [],
          reused.minutes ?? 0
        )
      );
    }

    const transcript = await step.run("transcript", () =>
      fetchVideoTranscriptForBuild(kbId, videoId)
    );
    if (transcript.skipped) {
      return step.run("record-transcript-skip", () =>
        markVideoBuildSkipped(kbId, videoId, persistent, transcript.reason)
      );
    }

    const chunked = await step.run("chunk", () => persistVideoChunksForBuild(kbId, videoId));
    if (chunked.skipped) {
      return step.run("record-chunk-skip", () =>
        markVideoBuildSkipped(kbId, videoId, persistent, chunked.reason)
      );
    }

    await step.run("embed", () => embedPersistedVideoChunks(kbId, videoId, chunked.chunkIds));

    return step.run("index", () =>
      writeVideoIndexForBuild(kbId, videoId, persistent, chunked.chunkIds, chunked.minutes)
    );
  }
);

export const kbBuildRequested = inngest.createFunction(
  {
    id: "kb-build",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.kbId" },
    timeouts: { finish: "15m" },
    triggers: [kbBuildRequestedEvent],
    onFailure: async ({ event, error }) => {
      const data = originalBuildEvent(event);
      if (!data?.kbId) return;
      await failKnowledgeBaseBuild(
        data.kbId,
        Boolean(data.persistent),
        error.message || "Knowledge base build failed."
      );
    },
  },
  async ({ event, step }) => {
    const { kbId, persistent } = event.data;
    if (!(await getKnowledgeBase(kbId))) {
      return { kbId, status: "failed" as const, results: [] as VideoBuildResult[] };
    }

    const pending = await step.run("load-videos", () => loadPendingBuildVideos(kbId));

    if (pending.kb.status === "ready" || pending.kb.status === "failed") {
      return { kbId, status: pending.kb.status, results: [] as VideoBuildResult[] };
    }

    if (pending.videos.length === 0) {
      const finalized = await step.run("finalize-empty", () =>
        completeKnowledgeBaseBuild(kbId, persistent, [])
      );
      return { kbId, status: finalized.status, results: [] as VideoBuildResult[] };
    }

    const results = await Promise.all(
      pending.videos.map(async (video) => {
        try {
          return await step.invoke(`video-${video.videoId}`, {
            function: kbBuildVideo,
            data: { kbId, videoId: video.videoId, persistent },
            timeout: "8m",
          });
        } catch (err) {
          const failed = failedVideoBuildResult(video, err);
          await step.run(`record-failed-${video.videoId}`, () =>
            applyVideoBuildResultToKb(kbId, persistent, failed)
          );
          return failed;
        }
      })
    );

    const finalized = await step.run("finalize", () =>
      completeKnowledgeBaseBuild(kbId, persistent, results)
    );

    return { kbId, status: finalized.status, results };
  }
);

export async function requestKbBuild(kbId: string, persistent: boolean): Promise<void> {
  try {
    await inngest.send(kbBuildRequestedEvent.create({ kbId, persistent }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to enqueue knowledge base build";
    console.error(`Inngest KB build enqueue failed for ${kbId}:`, err);
    captureException(err, { kbId, persistent, stage: "inngestEnqueue" });
    await failKnowledgeBaseBuild(kbId, persistent, `Build could not be started: ${message}`);
  }
}

export const kbBuildFunctions = [kbBuildRequested, kbBuildVideo];
