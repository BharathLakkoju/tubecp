import {
  inngest,
  kbBuildRequestedEvent,
  kbBuildVideoEvent,
} from "@/lib/inngest/client";
import {
  assertKbInngestRunnerConfigured,
  KbBuildRunnerMisconfiguredError,
} from "@/lib/inngest/runtime";
import { chunkIdsInBatches, kbBuildStepRun } from "@/lib/inngest/kb-build-step";
import { captureException } from "@/lib/observe";
import { getJobStore, TERMINAL_JOB_STATUSES } from "@/lib/pipeline/jobs";
import {
  applyVideoBuildResultToKb,
  completeKnowledgeBaseBuild,
  embedPersistedVideoChunks,
  failKnowledgeBaseBuild,
  failedVideoBuildResult,
  fetchVideoTranscriptForBuild,
  KB_BUILD_EMBED_BATCH_SIZE,
  KB_BUILD_VIDEO_CONCURRENCY,
  KB_BUILD_VIDEO_INVOKE_TIMEOUT,
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

    const reused = await kbBuildStepRun(step, "reuse-indexed", async () => {
      const { video } = await loadBuildVideo(kbId, videoId);
      return reuseIndexedVideoIfPresent(kbId, video);
    });
    if (reused) {
      return kbBuildStepRun(step, "index-reused", () =>
        writeVideoIndexForBuild(
          kbId,
          videoId,
          persistent,
          reused.chunkIds ?? [],
          reused.minutes ?? 0
        )
      );
    }

    const transcript = await kbBuildStepRun(step, "transcript", () =>
      fetchVideoTranscriptForBuild(kbId, videoId)
    );
    if (transcript.skipped) {
      return kbBuildStepRun(step, "record-transcript-skip", () =>
        markVideoBuildSkipped(kbId, videoId, persistent, transcript.reason)
      );
    }

    const chunked = await kbBuildStepRun(step, "chunk", () =>
      persistVideoChunksForBuild(kbId, videoId)
    );
    if (chunked.skipped) {
      return kbBuildStepRun(step, "record-chunk-skip", () =>
        markVideoBuildSkipped(kbId, videoId, persistent, chunked.reason)
      );
    }

    for (const [index, batch] of chunkIdsInBatches(
      chunked.chunkIds,
      KB_BUILD_EMBED_BATCH_SIZE
    ).entries()) {
      await kbBuildStepRun(step, `embed-${index}`, () =>
        embedPersistedVideoChunks(kbId, videoId, batch)
      );
    }

    return kbBuildStepRun(step, "index", () =>
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

    const pending = await kbBuildStepRun(step, "load-videos", () => loadPendingBuildVideos(kbId));

    if (pending.kb.status === "ready" || pending.kb.status === "failed") {
      return { kbId, status: pending.kb.status, results: [] as VideoBuildResult[] };
    }

    if (pending.videos.length === 0) {
      const finalized = await kbBuildStepRun(step, "finalize-empty", () =>
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
            timeout: KB_BUILD_VIDEO_INVOKE_TIMEOUT,
          });
        } catch (err) {
          const failed = failedVideoBuildResult(video, err);
          await kbBuildStepRun(step, `record-failed-${video.videoId}`, () =>
            applyVideoBuildResultToKb(kbId, persistent, failed)
          );
          return failed;
        }
      })
    );

    const finalized = await kbBuildStepRun(step, "finalize", () =>
      completeKnowledgeBaseBuild(kbId, persistent, results)
    );

    return { kbId, status: finalized.status, results };
  }
);

export async function requestKbBuild(kbId: string, persistent: boolean): Promise<void> {
  try {
    assertKbInngestRunnerConfigured();
    await inngest.send(kbBuildRequestedEvent.create({ kbId, persistent }));
  } catch (err) {
    if (err instanceof KbBuildRunnerMisconfiguredError) throw err;
    const message = err instanceof Error ? err.message : "Failed to enqueue knowledge base build";
    console.error(`Inngest KB build enqueue failed for ${kbId}:`, err);
    captureException(err, { kbId, persistent, stage: "inngestEnqueue" });
    await failKnowledgeBaseBuild(kbId, persistent, `Build could not be started: ${message}`);
  }
}

export const kbBuildFunctions = [kbBuildRequested, kbBuildVideo];
