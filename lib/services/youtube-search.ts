import { google } from "googleapis";
import { assertYoutubeKey } from "../config";
import type { DateRange, VideoCandidate } from "../types";

function parseDuration(iso?: string): string | undefined {
  if (!iso) return undefined;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = parseInt(match[1] ?? "0", 10);
  const m = parseInt(match[2] ?? "0", 10);
  const s = parseInt(match[3] ?? "0", 10);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function searchYouTube(
  query: string,
  options?: {
    maxResults?: number;
    publishedAfter?: string;
    publishedBefore?: string;
  }
): Promise<VideoCandidate[]> {
  const youtube = google.youtube({ version: "v3", auth: assertYoutubeKey() });
  const maxResults = Math.min(options?.maxResults ?? 25, 50);

  const response = await youtube.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    maxResults,
    order: "relevance",
    publishedAfter: options?.publishedAfter,
    publishedBefore: options?.publishedBefore,
    videoCaption: "closedCaption",
  });

  const items = response.data.items ?? [];
  const videoIds = items
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (videoIds.length === 0) return [];

  const details = await youtube.videos.list({
    part: ["contentDetails", "snippet"],
    id: videoIds,
  });

  const detailMap = new Map(
    (details.data.items ?? []).map((item) => [item.id!, item])
  );

  const results: VideoCandidate[] = [];
  for (const item of items) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;
    const detail = detailMap.get(videoId);
    const snippet = detail?.snippet ?? item.snippet;
    results.push({
      videoId,
      title: snippet?.title ?? "Untitled",
      channel: snippet?.channelTitle ?? "Unknown",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: snippet?.publishedAt ?? "",
      duration: parseDuration(detail?.contentDetails?.duration ?? undefined),
      description: snippet?.description?.slice(0, 500),
    });
  }
  return results;
}

export async function searchYouTubeMultiple(
  queries: string[],
  dateRange?: DateRange,
  maxPerQuery = 15
): Promise<VideoCandidate[]> {
  const seen = new Set<string>();
  const results: VideoCandidate[] = [];

  for (const query of queries) {
    const videos = await searchYouTube(query, {
      maxResults: maxPerQuery,
      publishedAfter: dateRange?.from,
      publishedBefore: dateRange?.to,
    });
    for (const video of videos) {
      if (!seen.has(video.videoId)) {
        seen.add(video.videoId);
        results.push(video);
      }
    }
  }

  return results;
}
