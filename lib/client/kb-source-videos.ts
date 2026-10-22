import type { SkippedKbVideo } from "@/lib/client/workflows";
import type { RankedVideo } from "@/lib/types";

/** Show only the failure reason — skip reasons often repeat the video title in quotes. */
export function displaySkipReason(reason: string, title?: string): string {
  const trimmed = reason.trim();
  if (!trimmed) return "Indexing failed.";

  if (title) {
    for (const sep of [" — ", " - "]) {
      const prefix = `"${title}" skipped${sep}`;
      if (trimmed.startsWith(prefix)) {
        return trimmed.slice(prefix.length).trim();
      }
    }
  }

  const quoted = trimmed.match(/^"[^"]+"\s+skipped\s*[—-]\s*(.+)$/i);
  if (quoted?.[1]) return quoted[1].trim();

  return trimmed.replace(/^skipped\s*[—-]\s*/i, "").trim() || trimmed;
}

export function youtubeWatchUrl(video: { videoId: string; url?: string }): string {
  const url = video.url?.trim();
  if (url) return url;
  return `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`;
}

export type KbNotIndexedVideo = {
  video: RankedVideo;
  reason?: string;
  skipped: boolean;
};

export function listKbNotIndexedVideos(
  sourceVideos: RankedVideo[],
  indexedVideoIds: string[],
  skippedVideos: SkippedKbVideo[] = []
): KbNotIndexedVideo[] {
  const indexed = new Set(indexedVideoIds);
  const skipById = new Map(
    skippedVideos.filter((item) => item.videoId).map((item) => [item.videoId, item])
  );

  const listed = new Set<string>();
  const rows: KbNotIndexedVideo[] = sourceVideos
    .filter((video) => !indexed.has(video.videoId))
    .map((video) => {
      listed.add(video.videoId);
      const skip = skipById.get(video.videoId);
      return {
        video,
        reason: skip?.reason,
        skipped: Boolean(skip),
      };
    });

  for (const skip of skippedVideos) {
    if (!skip.videoId || indexed.has(skip.videoId) || listed.has(skip.videoId)) continue;
    listed.add(skip.videoId);
    rows.push({
      video: {
        videoId: skip.videoId,
        title: skip.title || "Video",
        channel: "",
        url: youtubeWatchUrl({ videoId: skip.videoId }),
        thumbnailUrl: `https://i.ytimg.com/vi/${skip.videoId}/hqdefault.jpg`,
        relevanceScore: 0,
        whyRelevant: "",
        discussionLevel: "brief",
      },
      reason: skip.reason,
      skipped: true,
    });
  }

  return rows;
}
