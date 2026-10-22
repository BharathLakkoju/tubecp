import type { SkippedKbVideo } from "@/lib/client/workflows";
import type { KnowledgeBase, RankedVideo } from "@/lib/types";

export function mergeSkippedKbVideos(
  kb: KnowledgeBase,
  sourceVideos: RankedVideo[],
  sessionSkipped: SkippedKbVideo[] = []
): SkippedKbVideo[] {
  const byId = new Map<string, SkippedKbVideo>();

  for (const item of sessionSkipped) {
    if (item.videoId) {
      byId.set(item.videoId, item);
    } else if (item.reason) {
      byId.set(`reason:${item.reason}`, item);
    }
  }

  const skippedIds = kb.buildJob?.skippedVideoIds ?? [];
  const fallbackReason =
    kb.buildJob?.error?.trim() || "Transcript unavailable or indexing failed.";

  for (const videoId of skippedIds) {
    if (byId.has(videoId)) continue;
    const video = sourceVideos.find((v) => v.videoId === videoId);
    byId.set(videoId, {
      videoId,
      title: video?.title ?? "Unknown video",
      reason: `"${video?.title ?? videoId}" skipped — ${fallbackReason}`,
    });
  }

  return [...byId.values()];
}
