import { config } from "../config";
import { getCachedExpandedQueries, cacheExpandedQueries, hashTopic } from "../store";
import { cosineSimilarity, generateEmbeddings, generateText } from "./llm";
import { dedupeQueries, sanitizeExpandedQuery, topicTerms } from "./research-scoring";
import { fetchYoutubeSearchSuggestions } from "./youtube-query-suggest";

export type QueryIntent = "learn" | "compare" | "generic";

const LEARN_RE =
  /\b(how (?:do i|to)|tutorial|learn(?:ing)?|course|explained|walkthrough|beginner|guide)\b/i;
const COMPARE_RE = /\b(best|vs\.?|versus|review|compar(?:e|ison)|alternative)\b/i;

/** Audience/format words that change intent instead of paraphrasing it. */
const FORMAT_PHRASES = ["for beginners", "full course", "step by step", "mistakes to avoid"];
const FORMAT_WORDS = [
  "explained",
  "beginners",
  "beginner",
  "tutorial",
  "tips",
  "tip",
  "guide",
  "walkthrough",
  "course",
  "intro",
  "introduction",
  "101",
  "lesson",
];

const INTENT_NOISE = new Set([
  "best",
  "top",
  "vs",
  "versus",
  "cheap",
  "good",
  "new",
  "latest",
  "really",
  "very",
  "ultimate",
]);

const TWO_LETTER_STOP = new Set([
  "an",
  "as",
  "at",
  "by",
  "do",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "to",
  "we",
]);

const PARAPHRASE_SYSTEM = `You expand a YouTube research topic into alternative search queries.

Return ONLY a JSON array of 2-4 short search queries.
Rules:
- Keep the same subject and intent
- Paraphrase with synonyms or adjacent concepts (example: monetization → revenue, MRR, pricing)
- Do NOT add format or audience words: explained, for beginners, tutorial, tips, guide, walkthrough, review, course, full course, 101, intro
- Do NOT drop proper nouns or the core entity
- Do NOT add a new niche or a year unless the topic already has one`;

const EMBEDDING_SIMILARITY_MIN = 0.45;

function topicStem(topic: string): string {
  const base = topic.replace(/\b20\d{2}\b/g, "").trim();
  return base.replace(/^how (?:do i|to)\s+/i, "").trim() || base;
}

export function detectQueryIntent(topic: string): QueryIntent {
  if (LEARN_RE.test(topic)) return "learn";
  if (COMPARE_RE.test(topic)) return "compare";
  return "generic";
}

function expansionTerms(text: string): string[] {
  const terms = topicTerms(text);
  const seen = new Set(terms);
  for (const token of text.toLowerCase().split(/\W+/)) {
    if (token.length === 2 && !TWO_LETTER_STOP.has(token) && !seen.has(token)) {
      seen.add(token);
      terms.push(token);
    }
  }
  return terms;
}

function requiredTopicTerms(topic: string): string[] {
  return expansionTerms(topic).filter((term) => !INTENT_NOISE.has(term));
}

/** True when the expansion still talks about the same subject. */
export function queryPreservesTopic(topic: string, query: string): boolean {
  const required = requiredTopicTerms(topic);
  if (required.length === 0) return expansionTerms(query).length > 0;

  const haystack = query.toLowerCase();
  const hits = required.filter((term) => haystack.includes(term));
  const minHits = Math.max(1, Math.ceil(required.length * 0.5));
  return hits.length >= minHits;
}

function hasPhraseOrWord(text: string, phrase: string): boolean {
  if (phrase.includes(" ")) return text.includes(phrase);
  return new RegExp(`\\b${phrase}\\b`, "i").test(text);
}

export function introducesFormatWords(topic: string, query: string): boolean {
  const topicLower = topic.toLowerCase();
  const queryLower = query.toLowerCase();

  for (const phrase of FORMAT_PHRASES) {
    if (queryLower.includes(phrase) && !topicLower.includes(phrase)) return true;
  }
  for (const word of FORMAT_WORDS) {
    if (hasPhraseOrWord(queryLower, word) && !hasPhraseOrWord(topicLower, word)) return true;
  }
  return false;
}

function keepSuggestion(topic: string, query: string, intent: QueryIntent): boolean {
  const cleaned = sanitizeExpandedQuery(query, topic);
  if (!cleaned) return false;
  if (cleaned.toLowerCase() === topic.trim().toLowerCase()) return false;
  if (!queryPreservesTopic(topic, cleaned)) return false;
  if (intent !== "learn" && introducesFormatWords(topic, cleaned)) return false;
  return true;
}

function keepParaphrase(topic: string, query: string): boolean {
  const cleaned = sanitizeExpandedQuery(query, topic);
  if (!cleaned) return false;
  if (cleaned.toLowerCase() === topic.trim().toLowerCase()) return false;
  if (!queryPreservesTopic(topic, cleaned)) return false;
  if (introducesFormatWords(topic, cleaned)) return false;
  return true;
}

/** Intent-gated suffixes only — last resort when suggest + paraphrases are thin. */
export function fallbackQueries(topic: string): string[] {
  const intent = detectQueryIntent(topic);
  const terms = topicStem(topic);
  const lower = topic.toLowerCase();
  const out: string[] = [];

  const add = (query: string) => {
    if (!queryPreservesTopic(topic, query)) return;
    if (query.toLowerCase() === lower) return;
    out.push(query);
  };

  if (intent === "learn") {
    if (!/\bhow to\b/i.test(lower)) add(`how to ${terms}`);
    if (!/\btutorial\b/i.test(lower)) add(`${terms} tutorial`);
    if (!/\bwalkthrough\b/i.test(lower)) add(`${terms} walkthrough`);
    return out;
  }

  if (intent === "compare") {
    if (!/\breview\b/i.test(lower)) add(`${terms} review`);
    if (!/\bvs\b/i.test(lower)) add(`${terms} vs`);
    if (!/\bcompar/i.test(lower)) add(`${terms} comparison`);
  }

  return out;
}

export function parseParaphrases(text: string): string[] {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) return [];

  try {
    const parsed: unknown = JSON.parse(match[0]);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "queries" in parsed
        ? (parsed as { queries: unknown }).queries
        : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim())
      .slice(0, 4);
  } catch {
    return [];
  }
}

async function paraphraseQueries(topic: string, usageUserId?: string): Promise<string[]> {
  if (!config.openrouterApiKey) return [];

  try {
    const raw = await generateText(
      PARAPHRASE_SYSTEM,
      `Topic: ${topic}\nReturn a JSON array of 2-4 YouTube search queries.`,
      {
        temperature: 0.3,
        maxTokens: 220,
        timeoutMs: 8_000,
        retries: 1,
        retryBackoffMs: 400,
        usageUserId,
      }
    );
    return parseParaphrases(raw).filter((query) => keepParaphrase(topic, query));
  } catch {
    return [];
  }
}

async function filterByEmbedding(
  topic: string,
  queries: string[],
  usageUserId?: string
): Promise<string[]> {
  if (queries.length === 0) return [];

  try {
    const vectors = await generateEmbeddings([topic, ...queries], { usageUserId });
    const topicVec = vectors[0];
    if (!topicVec) return queries;

    return queries.filter((query, index) => {
      const vector = vectors[index + 1];
      if (!vector) return true;
      return cosineSimilarity(topicVec, vector) >= EMBEDDING_SIMILARITY_MIN;
    });
  } catch {
    return queries;
  }
}

const EXPAND_CACHE_VERSION = "v5";

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

async function buildExpandedQueries(
  topic: string,
  maxQueries: number,
  usageUserId?: string
): Promise<string[]> {
  const trimmed = topic.trim();
  const intent = detectQueryIntent(trimmed);

  const suggestions = (await fetchYoutubeSearchSuggestions(trimmed)).filter((query) =>
    keepSuggestion(trimmed, query, intent)
  );

  const suggestionCap = Math.max(1, Math.ceil((maxQueries - 1) / 2));
  const firstSuggestions = suggestions.slice(0, suggestionCap);
  const paraphrases = await filterByEmbedding(
    trimmed,
    await paraphraseQueries(trimmed, usageUserId),
    usageUserId
  );
  const restSuggestions = suggestions.slice(suggestionCap);
  const needFallback = firstSuggestions.length + paraphrases.length < maxQueries - 1;
  const fallbacks = needFallback ? fallbackQueries(trimmed) : [];

  return dedupeQueries(
    trimmed,
    [...firstSuggestions, ...paraphrases, ...restSuggestions, ...fallbacks],
    maxQueries
  );
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

  const queries = await buildExpandedQueries(trimmed, maxQueries, options?.usageUserId);
  await cacheExpandedQueries(topicHash, queries);
  return { queries, cached: false };
}
