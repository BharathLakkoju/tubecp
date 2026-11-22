import type { KnowledgeBaseBuildStatus } from "@/lib/kb-build-status";
import type { KbStatus, KnowledgeBaseRecord } from "@/lib/types";

export function isKbBuildInProgress(status: KbStatus | string): boolean {
  return status === "building" || status === "finalizing";
}

/**
 * No build heartbeat for this long → the invocation that was indexing a video is gone.
 * Slightly above the lock TTL so a live step is not treated as paused.
 */
export const KB_BUILD_STALE_MS = 90 * 1000;

export function kbBuildLastActivityMs(record: KnowledgeBaseRecord): number {
  const raw = record.buildJob?.updatedAt ?? record.createdAt;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

export function isKbBuildStale(record: KnowledgeBaseRecord): boolean {
  if (!isKbBuildInProgress(record.status)) return false;
  return Date.now() - kbBuildLastActivityMs(record) > KB_BUILD_STALE_MS;
}

/** Indexed count reached but finalize never ran (tab closed after last video). */
export function kbBuildNeedsFinalize(record: KnowledgeBaseRecord): boolean {
  if (!isKbBuildInProgress(record.status)) return false;
  const total = record.buildJob?.totalVideos ?? record.rankedVideos?.length ?? 0;
  const processed = record.buildJob?.processedVideos ?? 0;
  return total > 0 && processed >= total;
}

export function isKbBuildStatusStale(status: KnowledgeBaseBuildStatus): boolean {
  if (!isKbBuildInProgress(status.status)) return false;
  const t = new Date(status.updatedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t > KB_BUILD_STALE_MS;
}

export function kbBuildStatusNeedsFinalize(status: KnowledgeBaseBuildStatus): boolean {
  return (
    isKbBuildInProgress(status.status) &&
    status.totalVideos > 0 &&
    status.processedVideos >= status.totalVideos
  );
}
