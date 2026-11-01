import { ensureKbWelcomeMessage, refreshKbWelcomeMessage } from "@/lib/services/kb-chat";
import { getKnowledgeBase, updateKnowledgeBase } from "@/lib/store";
import { getJobStore } from "@/lib/pipeline/jobs";

export async function finalizeQueueBuildIfComplete(kbId: string): Promise<boolean> {
  const store = getJobStore();
  const run = await store.getRun(kbId);
  if (!run) return false;

  const started = run.status === "finalizing" || (await store.tryBeginFinalize(kbId));
  if (!started && run.status !== "finalizing") return false;

  const jobs = await store.listJobs(kbId);
  const indexed = jobs.filter((job) => job.status === "indexed");
  const chunkIds = [...new Set(indexed.flatMap((job) => job.chunkIds))];
  const skippedIds = jobs.filter((job) => job.status === "skipped" || job.status === "failed").map((job) => job.videoId);
  const minutes = indexed.reduce((sum, job) => sum + job.minutes, 0);
  const failed = chunkIds.length === 0;
  const firstError = jobs.find((job) => job.errorMessage)?.errorMessage;

  await updateKnowledgeBase(
    kbId,
    (current) => ({
      ...current,
      status: failed ? "failed" : "ready",
      chunkIds,
      chunksIndexed: chunkIds.length,
      videosIndexed: indexed.length,
      totalMinutes: Math.round(minutes),
      videoIds: [...new Set([...current.videoIds, ...indexed.map((job) => job.videoId)])],
      buildJob: {
        totalVideos: jobs.length,
        processedVideos: jobs.length,
        skippedCount: skippedIds.length,
        skippedVideoIds: skippedIds,
        startedAt: current.buildJob?.startedAt ?? current.createdAt,
        updatedAt: new Date().toISOString(),
        error: failed
          ? firstError ||
            "No videos could be indexed. Every selected video was missing a transcript or failed to index."
          : undefined,
      },
    }),
    run.persistent
  );

  if (!failed) {
    try {
      await ensureKbWelcomeMessage(kbId);
      await refreshKbWelcomeMessage(kbId);
    } catch (err) {
      console.error(`KB welcome message failed for ${kbId}:`, err);
    }
  }

  await store.finishRun(kbId, failed ? "failed" : "ready");
  return (await getKnowledgeBase(kbId))?.status !== "building";
}
