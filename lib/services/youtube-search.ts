import { google } from "googleapis";
import { assertYoutubeKey } from "../config";
import { recordYouTubeQuotaUsage } from "../usage/api-cost";
import { incrementYouTubeQuota } from "../usage/youtube-quota";
import {
  PRIMARY_SEARCH_RESULTS,
  MAX_SECONDARY_QUERIES,
  SECONDARY_SEARCH_RESULTS,
} from "../constants/research";
import type { ResearchSearchLimits } from "../research-limits";
import type { DateRange, QueryKind, SearchMatch, VideoCandidate } from "../types";

const YOUTUBE_SEARCH_PAGE_SIZE = 50;

export type YoutubeSearchOptions = {
  maxResults?: number;
  publishedAfter?: string;
  publishedBefore?: string;
  usageUserId?: string;
  pageToken?: string;
};

export type YoutubeSearchPage = {
  videos: VideoCandidate[];
  nextPageToken?: string;
};

export type YoutubeSearchPageFn = (
  query: string,
  options?: YoutubeSearchOptions
) => Promise<YoutubeSearchPage>;

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

export async function searchYouTubePage(
  query: string,
  options?: YoutubeSearchOptions
): Promise<YoutubeSearchPage> {
  const youtube = google.youtube({ version: "v3", auth: assertYoutubeKey() });
  const maxResults = Math.min(options?.maxResults ?? 25, YOUTUBE_SEARCH_PAGE_SIZE);

  const response = await youtube.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    maxResults,
    order: "relevance",
    publishedAfter: options?.publishedAfter,
    publishedBefore: options?.publishedBefore,
    ...(options?.pageToken ? { pageToken: options.pageToken } : {}),
  });

  await incrementYouTubeQuota(100);
  await recordYouTubeQuotaUsage(options?.usageUserId, 100);

  const items = response.data.items ?? [];
  const nextPageToken = response.data.nextPageToken ?? undefined;
  const videoIds = items
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (videoIds.length === 0) return { videos: [], nextPageToken };

  const details = await youtube.videos.list({
    part: ["contentDetails", "snippet"],
    id: videoIds,
  });

  await incrementYouTubeQuota(1);
  await recordYouTubeQuotaUsage(options?.usageUserId, 1);

  const detailMap = new Map((details.data.items ?? []).map((item) => [item.id!, item]));

  const videos: VideoCandidate[] = [];
  for (const item of items) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;
    const detail = detailMap.get(videoId);
    const snippet = detail?.snippet ?? item.snippet;
    videos.push({
      videoId,
      title: snippet?.title ?? "Untitled",
      channel: snippet?.channelTitle ?? "Unknown",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: snippet?.publishedAt ?? "",
      duration: parseDuration(detail?.contentDetails?.duration ?? undefined),
      description: snippet?.description?.slice(0, 500),
    });
  }
  return { videos, nextPageToken };
}

export async function searchYouTube(
  query: string,
  options?: YoutubeSearchOptions
): Promise<VideoCandidate[]> {
  const page = await searchYouTubePage(query, options);
  return page.videos;
}

type ScoredCandidate = {
  video: VideoCandidate;
  score: number;
  bestRank: number;
  hits: number;
  matches: SearchMatch[];
};

function positionScore(rank: number, isPrimary: boolean): number {
  if (isPrimary) return Math.max(0, 30 - rank);
  return Math.max(0, 12 - rank);
}

function mergeSearchResults(
  scoreMap: Map<string, ScoredCandidate>,
  videos: VideoCandidate[],
  isPrimary: boolean,
  weight: number,
  rankOffset = 0,
  query?: { text: string; kind: QueryKind }
): void {
  videos.forEach((video, index) => {
    const rank = rankOffset + index + 1;
    const points = positionScore(rank, isPrimary) * weight;
    const match: SearchMatch | null = query
      ? { query: query.text, kind: query.kind, rank }
      : null;
    const existing = scoreMap.get(video.videoId);

    if (existing) {
      existing.score += points;
      existing.hits += 1;
      existing.bestRank = Math.min(existing.bestRank, rank);
      if (match) existing.matches.push(match);
    } else {
      scoreMap.set(video.videoId, {
        video,
        score: points,
        bestRank: rank,
        hits: 1,
        matches: match ? [match] : [],
      });
    }
  });
}

export async function searchYouTubeMultiple(
  queries: string[],
  dateRange?: DateRange,
  searchLimits?: Partial<ResearchSearchLimits>,
  usageUserId?: string,
  deps?: { searchPage?: YoutubeSearchPageFn; queryKinds?: QueryKind[] }
): Promise<VideoCandidate[]> {
  if (queries.length === 0) return [];

  const searchPage = deps?.searchPage ?? searchYouTubePage;
  const primaryResultsLimit = searchLimits?.primarySearchResults ?? PRIMARY_SEARCH_RESULTS;
  const secondaryResultsLimit = searchLimits?.secondarySearchResults ?? SECONDARY_SEARCH_RESULTS;
  const maxSecondaryQueries = searchLimits?.maxSecondaryQueries ?? MAX_SECONDARY_QUERIES;
  const targetUniqueResults = searchLimits?.targetUniqueResults ?? primaryResultsLimit;
  const maxPrimaryPages = searchLimits?.maxPrimaryPages ?? 1;

  const kinds = deps?.queryKinds ?? [];
  const kindAt = (index: number): QueryKind => kinds[index] ?? (index === 0 ? "topic" : "paraphrase");
  const [primary, ...secondary] = queries;
  const scoreMap = new Map<string, ScoredCandidate>();
  const searchOpts = {
    publishedAfter: dateRange?.from,
    publishedBefore: dateRange?.to,
    usageUserId,
  };

  const firstPage = await searchPage(primary, {
    ...searchOpts,
    maxResults: primaryResultsLimit,
  });
  let primaryPages = 1;
  let primaryCount = firstPage.videos.length;
  let nextPageToken = firstPage.nextPageToken;
  mergeSearchResults(scoreMap, firstPage.videos, true, 1, 0, {
    text: primary,
    kind: kindAt(0),
  });

  const secondaryQueries = secondary.slice(0, maxSecondaryQueries);
  if (secondaryQueries.length > 0) {
    const secondaryBatches = await Promise.all(
      secondaryQueries.map((query) =>
        searchPage(query, {
          ...searchOpts,
          maxResults: secondaryResultsLimit,
        })
      )
    );

    secondaryBatches.forEach((page, index) => {
      mergeSearchResults(scoreMap, page.videos, false, 0.4, 0, {
        text: secondaryQueries[index],
        kind: kindAt(index + 1),
      });
    });
  }

  while (
    scoreMap.size < targetUniqueResults &&
    nextPageToken &&
    primaryPages < maxPrimaryPages
  ) {
    const remaining = targetUniqueResults - scoreMap.size;
    const page = await searchPage(primary, {
      ...searchOpts,
      maxResults: Math.min(primaryResultsLimit, Math.max(remaining, 1)),
      pageToken: nextPageToken,
    });
    primaryPages += 1;
    mergeSearchResults(scoreMap, page.videos, true, 1, primaryCount, {
      text: primary,
      kind: kindAt(0),
    });
    primaryCount += page.videos.length;
    nextPageToken = page.nextPageToken;
    if (page.videos.length === 0) break;
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ video, score, bestRank, hits, matches }) => ({
      ...video,
      searchScore: Math.round(score),
      searchRank: bestRank,
      matchedQueries: hits,
      matches,
    }));
}
