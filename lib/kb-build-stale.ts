import type { KnowledgeBaseBuildStatus } from "@/lib/kb-build-status";
import type { KnowledgeBaseRecord } from "@/lib/types";

/** No build-job heartbeat for this long → likely abandoned tab or hung request. */
export const KB_BUILD_STALE_MS = 20 * 60 * 1000;

export function kbBuildLastActivityMs(record: KnowledgeBaseRecord): number {
  const raw = record.buildJob?.updatedAt ?? record.createdAt;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

export function isKbBuildStale(record: KnowledgeBaseRecord): boolean {
  if (record.status !== "building") return false;
  return Date.now() - kbBuildLastActivityMs(record) > KB_BUILD_STALE_MS;
}

/** Indexed count reached but finalize never ran (tab closed after last video). */
export function kbBuildNeedsFinalize(record: KnowledgeBaseRecord): boolean {
  if (record.status !== "building") return false;
  const total = record.buildJob?.totalVideos ?? record.rankedVideos?.length ?? 0;
  const processed = record.buildJob?.processedVideos ?? 0;
  return total > 0 && processed >= total;
}

export function isKbBuildStatusStale(status: KnowledgeBaseBuildStatus): boolean {
  if (status.status !== "building") return false;
  const t = new Date(status.updatedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t > KB_BUILD_STALE_MS;
}

export function kbBuildStatusNeedsFinalize(status: KnowledgeBaseBuildStatus): boolean {
  return (
    status.status === "building" &&
    status.totalVideos > 0 &&
    status.processedVideos >= status.totalVideos
  );
}
