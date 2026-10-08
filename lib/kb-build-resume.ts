import type { KnowledgeBaseRecord } from "@/lib/types";

/**
 * Index position for resuming a client-driven KB build.
 * Uses build job progress, but re-runs from the start when every video was
 * processed yet no chunks were stored (e.g. transient transcript outage).
 */
export function kbBuildStartIndex(record: KnowledgeBaseRecord): number {
  const ranked = record.rankedVideos ?? [];
  const total = ranked.length;
  if (total === 0) return 0;

  const processed = record.buildJob?.processedVideos ?? 0;

  if (processed >= total && record.chunkIds.length === 0) {
    return 0;
  }

  if (processed >= total) {
    return total;
  }

  return processed;
}
