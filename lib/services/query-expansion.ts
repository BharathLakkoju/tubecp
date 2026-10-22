import { getCachedExpandedQueries, cacheExpandedQueries, hashTopic } from "../store";
import { dedupeQueries } from "./research-scoring";
import { fetchYoutubeSearchSuggestions } from "./youtube-query-suggest";

function topicStem(topic: string): string {
  const base = topic.replace(/\b20\d{2}\b/g, "").trim();
  return base.replace(/^how (?:do i|to)\s+/i, "").trim() || base;
}

function isBuilderStyleTopic(topic: string): boolean {
  return /\b(how (?:do i|to)|build(?:ing)?|ship(?:ping)?|saas|startup|solo|developer|indie|app|code|profitable|monetiz)/i.test(
    topic
  );
}

/** Deterministic secondary YouTube queries when autocomplete is unavailable. */
export function fallbackQueries(topic: string): string[] {
  const terms = topicStem(topic);

  if (isBuilderStyleTopic(topic)) {
    return [
      `how to ${terms}`,
      `${terms} tutorial`,
      `${terms} walkthrough`,
      `building ${terms}`,
      `${terms} for beginners`,
      `${terms} mistakes to avoid`,
      `${terms} full course`,
    ];
  }

  return [
    `${terms} explained`,
    `${terms} tutorial`,
    `${terms} for beginners`,
    `${terms} review`,
    `${terms} walkthrough`,
    `${terms} tips`,
    `${terms} guide`,
  ];
}

const EXPAND_CACHE_VERSION = "v4";

export function expandQueriesCacheKey(topic: string, maxQueries: number): string {
  return hashTopic(`${EXPAND_CACHE_VERSION}:${maxQueries}:${topic.toLowerCase().trim()}`);
}

export async function peekExpandedQueries(
  topic: string,
  maxQueries: number
): Promise<string[] | null> {
  const topicHash = expandQueriesCacheKey(topic, maxQueries);
  const cached = await getCachedExpandedQueries(topicHash);
  if (!cached?.length) return null;
  return dedupeQueries(topic, cached, maxQueries);
}

async function buildExpandedQueries(topic: string, maxQueries: number): Promise<string[]> {
  const trimmed = topic.trim();
  const suggestions = await fetchYoutubeSearchSuggestions(trimmed);
  const candidates = [...suggestions, ...fallbackQueries(trimmed)];
  return dedupeQueries(trimmed, candidates, maxQueries);
}

export async function expandQueries(
  topic: string,
  options?: { maxQueries?: number; usageUserId?: string }
): Promise<{ queries: string[]; cached: boolean }> {
  const maxQueries = options?.maxQueries ?? 5;
  const trimmed = topic.trim();
  const topicHash = expandQueriesCacheKey(trimmed, maxQueries);
  const cached = await getCachedExpandedQueries(topicHash);
  if (cached?.length) {
    return { queries: dedupeQueries(trimmed, cached, maxQueries), cached: true };
  }

  const queries = await buildExpandedQueries(trimmed, maxQueries);
  await cacheExpandedQueries(topicHash, queries);
  return { queries, cached: false };
}
