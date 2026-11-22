import { estimateKbBuildCompletion } from "@/lib/kb-build-estimate";
import { knowledgeBaseBuildStatusFromRecord } from "@/lib/kb-build-status";
import { getJobStore, tryGetRun, type JobCounts } from "@/lib/pipeline/jobs";
import type { KnowledgeBaseRecord } from "@/lib/types";

function snapshotFromCounts(
  kb: KnowledgeBaseRecord,
  counts: JobCounts,
  currentTitle: string | undefined,
  updatedAt: string,
  startedAt: string,
  error?: string
): KnowledgeBaseRecord {
  return {
    ...kb,
    buildJob: {
      totalVideos: counts.total,
      processedVideos: counts.processed,
      skippedCount: counts.skipped + counts.failed,
      currentVideoTitle: currentTitle,
      startedAt,
      updatedAt,
      error: kb.status === "failed" ? error ?? kb.buildJob?.error : kb.buildJob?.error,
    },
  };
}

export async function withJobProgress(kb: KnowledgeBaseRecord): Promise<KnowledgeBaseRecord> {
  const run = await tryGetRun(kb.kbId);
  if (!run) return kb;

  try {
    const store = getJobStore();
    const counts = await store.counts(kb.kbId);
    const jobs = await store.listJobs(kb.kbId);
    const current = jobs.find(
      (job) => job.status === "fetching" || job.status === "embedding" || job.status === "fetched"
    );
    const firstError = jobs.find((job) => job.errorMessage)?.errorMessage;
    const updatedAt = (await store.latestActivity(kb.kbId)) ?? run.updatedAt;
    const status =
      kb.status === "ready" || kb.status === "failed"
        ? kb.status
        : run.status === "ready" || run.status === "failed"
          ? run.status
          : run.status === "finalizing"
            ? "finalizing"
            : "building";
    return snapshotFromCounts(
      { ...kb, status },
      counts,
      current?.title,
      updatedAt,
      run.createdAt,
      firstError ?? undefined
    );
  } catch (err) {
    console.warn(`Pipeline job counts unavailable for ${kb.kbId}:`, err);
    return kb;
  }
}

export async function resolveKnowledgeBaseBuildStatus(kb: KnowledgeBaseRecord) {
  const overlaid = await withJobProgress(kb);
  const status = knowledgeBaseBuildStatusFromRecord(overlaid);
  if (overlaid.status === "finalizing") {
    status.status = "finalizing";
    status.progress = Math.min(99, status.progress);
  }
  if (overlaid.buildJob) {
    const estimate =
      overlaid.status === "building"
        ? estimateKbBuildCompletion(overlaid.buildJob, "building")
        : { estimatedCompletionAt: null, estimatedSecondsRemaining: null };
    status.estimatedCompletionAt = estimate.estimatedCompletionAt;
    status.estimatedSecondsRemaining = estimate.estimatedSecondsRemaining;
  }
  return status;
}
