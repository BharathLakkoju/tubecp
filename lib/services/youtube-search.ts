import { google } from "googleapis";
import { assertYoutubeKey } from "../config";
import {
  PRIMARY_SEARCH_RESULTS,
  MAX_SECONDARY_QUERIES,
  SECONDARY_SEARCH_RESULTS,
} from "../constants/research";
import type { ResearchSearchLimits } from "../research-limits";
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

type ScoredCandidate = {
  video: VideoCandidate;
  score: number;
  bestRank: number;
  hits: number;
};

function positionScore(rank: number, isPrimary: boolean): number {
  if (isPrimary) return Math.max(0, 30 - rank);
  return Math.max(0, 12 - rank);
}

function mergeSearchResults(
  scoreMap: Map<string, ScoredCandidate>,
  videos: VideoCandidate[],
  isPrimary: boolean,
  weight: number
): void {
  videos.forEach((video, index) => {
    const rank = index + 1;
    const points = positionScore(rank, isPrimary) * weight;
    const existing = scoreMap.get(video.videoId);

    if (existing) {
      existing.score += points;
      existing.hits += 1;
      existing.bestRank = Math.min(existing.bestRank, rank);
    } else {
      scoreMap.set(video.videoId, {
        video,
        score: points,
        bestRank: rank,
        hits: 1,
      });
    }
  });
}

export async function searchYouTubeMultiple(
  queries: string[],
  dateRange?: DateRange,
  searchLimits?: Partial<ResearchSearchLimits>
): Promise<VideoCandidate[]> {
  if (queries.length === 0) return [];

  const primaryResultsLimit = searchLimits?.primarySearchResults ?? PRIMARY_SEARCH_RESULTS;
  const secondaryResultsLimit = searchLimits?.secondarySearchResults ?? SECONDARY_SEARCH_RESULTS;
  const maxSecondaryQueries = searchLimits?.maxSecondaryQueries ?? MAX_SECONDARY_QUERIES;

  const [primary, ...secondary] = queries;
  const scoreMap = new Map<string, ScoredCandidate>();
  const searchOpts = {
    publishedAfter: dateRange?.from,
    publishedBefore: dateRange?.to,
  };

  const primaryResults = await searchYouTube(primary, {
    ...searchOpts,
    maxResults: primaryResultsLimit,
  });
  mergeSearchResults(scoreMap, primaryResults, true, 1);

  const secondaryQueries = secondary.slice(0, maxSecondaryQueries);
  if (secondaryQueries.length > 0) {
    const secondaryBatches = await Promise.all(
      secondaryQueries.map((query) =>
        searchYouTube(query, {
          ...searchOpts,
          maxResults: secondaryResultsLimit,
        })
      )
    );

    secondaryBatches.forEach((videos, index) => {
      mergeSearchResults(scoreMap, videos, false, 0.4);
    });
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ video, score, bestRank, hits }) => ({
      ...video,
      searchScore: Math.round(score),
      searchRank: bestRank,
      matchedQueries: hits,
    }));
}
