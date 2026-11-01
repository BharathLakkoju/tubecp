import { ensureKbWelcomeMessage, refreshKbWelcomeMessage } from "@/lib/services/kb-chat";
import { getKnowledgeBase, updateKnowledgeBase } from "@/lib/store";
import { getJobStore } from "@/lib/pipeline/jobs";

async function writeTerminalKnowledgeBase(kbId: string, persistent: boolean): Promise<void> {
  const store = getJobStore();
  const jobs = await store.listJobs(kbId);
  const indexed = jobs.filter((job) => job.status === "indexed");
  const chunkIds = [...new Set(indexed.flatMap((job) => job.chunkIds))];
  const skippedIds = jobs
    .filter((job) => job.status === "skipped" || job.status === "failed")
    .map((job) => job.videoId);
  const minutes = indexed.reduce((sum, job) => sum + job.minutes, 0);
  const failed = chunkIds.length === 0;
  const firstError = jobs.find((job) => job.errorMessage)?.errorMessage;
  const existing = await getKnowledgeBase(kbId);
  const alreadyTerminal = existing?.status === "ready" || existing?.status === "failed";

  if (!alreadyTerminal) {
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
      persistent
    );

    if (!failed) {
      try {
        await ensureKbWelcomeMessage(kbId);
        await refreshKbWelcomeMessage(kbId);
      } catch (err) {
        console.error(`KB welcome message failed for ${kbId}:`, err);
      }
    }
  }

  await store.finishRun(kbId, failed ? "failed" : "ready");
}

export async function commitFinalizer(kbId: string): Promise<void> {
  const run = await getJobStore().getRun(kbId);
  if (!run) return;
  if (run.status === "ready" || run.status === "failed") return;
  await writeTerminalKnowledgeBase(kbId, run.persistent);
}

/** Completes a run that is building or stuck in `finalizing` after a Redis write failure. */
export async function finalizeQueueBuildIfComplete(kbId: string): Promise<boolean> {
  const store = getJobStore();
  const run = await store.getRun(kbId);
  if (!run) return false;
  if (run.status === "ready" || run.status === "failed") return true;

  if (run.status === "finalizing") {
    await writeTerminalKnowledgeBase(kbId, run.persistent);
    return true;
  }

  const won = await store.tryBeginFinalize(kbId);
  if (!won) {
    const latest = await store.getRun(kbId);
    if (latest?.status === "finalizing") {
      await writeTerminalKnowledgeBase(kbId, latest.persistent);
      return true;
    }
    return latest?.status !== "building";
  }

  await writeTerminalKnowledgeBase(kbId, run.persistent);
  return true;
}
