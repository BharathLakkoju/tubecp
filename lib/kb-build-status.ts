import { estimateKbBuildCompletion } from "@/lib/kb-build-estimate";
import type { KnowledgeBaseRecord } from "@/lib/types";

export function knowledgeBaseBuildStatusFromRecord(kb: KnowledgeBaseRecord) {
  const job = kb.buildJob;
  const total = job?.totalVideos ?? kb.rankedVideos?.length ?? 0;
  const processed = job?.processedVideos ?? 0;
  const progress =
    kb.status === "ready"
      ? 100
      : kb.status === "failed"
        ? kb.chunkIds.length > 0
          ? 100
          : total > 0
            ? Math.round((processed / total) * 100)
            : 0
        : total > 0
          ? Math.min(99, Math.round((processed / total) * 100))
          : kb.status === "finalizing"
            ? 99
            : 0;

  const estimate =
    job && kb.status === "building"
      ? estimateKbBuildCompletion(job, kb.status)
      : { estimatedCompletionAt: null, estimatedSecondsRemaining: null };

  return {
    kbId: kb.kbId,
    topic: kb.topic,
    status: kb.status,
    progress,
    totalVideos: total,
    processedVideos: processed,
    currentVideoTitle: job?.currentVideoTitle,
    skippedCount: job?.skippedCount ?? 0,
    error: job?.error,
    startedAt: job?.startedAt ?? kb.createdAt,
    updatedAt: job?.updatedAt ?? kb.createdAt,
    estimatedCompletionAt: estimate.estimatedCompletionAt,
    estimatedSecondsRemaining: estimate.estimatedSecondsRemaining,
  };
}

export type KnowledgeBaseBuildStatus = ReturnType<typeof knowledgeBaseBuildStatusFromRecord> & {
  /** Included on GET /api/knowledge-base/[kbId]/build-status while polling during a build. */
  indexedVideoIds?: string[];
  /** False when Neon job rows cannot be read (build may be running but progress is unknown). */
  pipelineJobStoreOk?: boolean;
  /** False on localhost without INNGEST_DEV — kicks only enqueue to cloud and never run here. */
  kbRunnerReady?: boolean;
  /** Actionable hint when kbRunnerReady or pipelineJobStoreOk is false. */
  runnerHint?: string;
};
