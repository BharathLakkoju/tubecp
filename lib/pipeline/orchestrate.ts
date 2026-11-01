import type { KnowledgeBaseRecord, RankedVideo } from "@/lib/types";
import { pipelineConfig } from "@/lib/pipeline/config";
import { getJobStore } from "@/lib/pipeline/jobs";
import { assertCanStartBuild, remainingFetchSlots } from "@/lib/pipeline/limits";
import { enqueue } from "@/lib/pipeline/queue";
import { ensureInProcessPipeline } from "@/lib/pipeline/runtime";
import { finalizeQueueBuildIfComplete } from "@/lib/pipeline/finalize";
import { updateKnowledgeBase } from "@/lib/store";

function useInProcessQueue(): boolean {
  const { fetchQueueUrl, embedQueueUrl } = pipelineConfig();
  return !fetchQueueUrl || !embedQueueUrl;
}

export async function startQueueBuild(
  kb: KnowledgeBaseRecord,
  rankedVideos: RankedVideo[],
  persistent: boolean
): Promise<void> {
  if (useInProcessQueue()) {
    ensureInProcessPipeline();
  }

  const store = getJobStore();
  const slots = await remainingFetchSlots(kb.userId);
  await store.insertRun({
    kbId: kb.kbId,
    userId: kb.userId,
    persistent,
    transcriptMode: kb.buildOptions?.transcriptMode ?? "captions",
    videos: rankedVideos,
  });

  await enqueue(
    "fetch",
    rankedVideos.slice(0, slots).map((video) => ({ kbId: kb.kbId, videoId: video.videoId }))
  );
}

export async function retryQueueBuild(kb: KnowledgeBaseRecord, persistent: boolean): Promise<void> {
  if (useInProcessQueue()) {
    ensureInProcessPipeline();
  }

  const store = getJobStore();
  const existing = await store.getRun(kb.kbId);
  if (!existing) {
    await startQueueBuild(kb, kb.rankedVideos ?? [], persistent);
    return;
  }

  await assertCanStartBuild(kb.userId);
  const reset = await store.resetRetryableJobs(kb.kbId);
  await updateKnowledgeBase(
    kb.kbId,
    (current) => ({
      ...current,
      status: "building",
      buildJob: {
        totalVideos: current.rankedVideos?.length ?? reset.length,
        processedVideos: 0,
        skippedCount: 0,
        skippedVideoIds: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
    persistent
  );

  const slots = await remainingFetchSlots(kb.userId);
  await enqueue(
    "fetch",
    reset.slice(0, slots).map((job) => ({ kbId: job.kbId, videoId: job.videoId }))
  );
}

export async function kickQueueBuild(kbId: string): Promise<void> {
  if (useInProcessQueue()) {
    ensureInProcessPipeline();
  }

  const store = getJobStore();
  const run = await store.getRun(kbId);
  if (!run) return;

  if (run.status === "finalizing" || run.status === "building") {
    const finalized = await finalizeQueueBuildIfComplete(kbId);
    if (finalized) return;
  }

  const slots = await remainingFetchSlots(run.userId);
  if (slots <= 0) return;
  const queued = await store.listQueuedJobs(run.userId, slots);
  const forThisKb = queued.filter((job) => job.kbId === kbId);
  await enqueue(
    "fetch",
    forThisKb.map((job) => ({ kbId: job.kbId, videoId: job.videoId }))
  );
}
