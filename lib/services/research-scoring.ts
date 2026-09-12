import type { ResearchPipelineLimits } from "../research-limits";
import type { VideoCandidate } from "../types";

export const CURRENT_YEAR = new Date().getFullYear();

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "it",
  "do",
  "does",
  "did",
  "how",
  "what",
  "when",
  "where",
  "why",
  "can",
  "i",
  "my",
  "me",
  "we",
  "you",
  "your",
]);

/** Extract meaningful terms from a research topic or query. */
export function topicTerms(topic: string): string[] {
  return [
    ...new Set(
      topic
        .toLowerCase()
        .split(/\W+/)
        .filter((term) => term.length > 2 && !STOP_WORDS.has(term))
    ),
  ];
}

/** Keyword overlap score (0–100) between a topic and video metadata. */
export function topicKeywordScore(topic: string, text: string): number {
  const terms = topicTerms(topic);
  if (terms.length === 0) return 0;

  const haystack = text.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (haystack.includes(term)) hits++;
  }
  return Math.round((hits / terms.length) * 100);
}

/** Remove stale years unless the original topic explicitly mentions a year. */
export function sanitizeExpandedQuery(query: string, topic: string): string {
  const topicHasYear = /\b20\d{2}\b/.test(topic);
  let cleaned = query.trim();

  if (!topicHasYear) {
    cleaned = cleaned.replace(/\b20\d{2}\b/g, " ").replace(/\s+/g, " ").trim();
  } else {
    cleaned = cleaned.replace(/\b20(1\d|2[0-5])\b/g, String(CURRENT_YEAR));
  }

  return cleaned;
}

export function dedupeQueries(topic: string, queries: string[], maxQueries = 5): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of [topic.trim(), ...queries]) {
    const cleaned = sanitizeExpandedQuery(raw, topic);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
    if (result.length >= maxQueries) break;
  }

  return result;
}

/** Blend YouTube search position with semantic/keyword signals. */
export function hybridCandidateScore(
  topic: string,
  video: VideoCandidate,
  embeddingScore: number
): number {
  const maxSearch = 30;
  const searchComponent = Math.min(100, ((video.searchScore ?? 0) / maxSearch) * 100);
  const keyword = topicKeywordScore(topic, `${video.title} ${video.description ?? ""}`);
  const emb = embeddingScore >= 0 ? embeddingScore * 100 : keyword;

  let score = searchComponent * 0.5 + emb * 0.3 + keyword * 0.2;

  if (video.searchRank && video.searchRank <= 5) score += 12;
  if ((video.matchedQueries ?? 0) >= 2) score += 6;

  return Math.min(100, Math.round(score));
}

export function isStrongYouTubeMatch(video: VideoCandidate, metadataScore: number): boolean {
  return (
    (video.searchRank !== undefined && video.searchRank <= 8) ||
    (video.searchScore !== undefined && video.searchScore >= 18) ||
    metadataScore >= 62
  );
}

/** Minimum bar for paid-tier "analyze all worthy" soft caps. */
export function isWorthyForAnalysis(topic: string, video: VideoCandidate): boolean {
  const keyword = topicKeywordScore(topic, `${video.title} ${video.description ?? ""}`);

  if (keyword >= 45) return true;
  if (video.searchRank !== undefined && video.searchRank <= 20) return true;
  if ((video.searchScore ?? 0) >= 8) return true;
  if ((video.matchedQueries ?? 0) >= 2) return true;

  return isStrongYouTubeMatch(video, keyword);
}

export function selectCandidatesForAnalysis(
  topic: string,
  preRanked: VideoCandidate[],
  limits: ResearchPipelineLimits
): VideoCandidate[] {
  const pool = limits.analyzeAllWorthy
    ? preRanked.filter((video) => isWorthyForAnalysis(topic, video))
    : preRanked;

  return pool.slice(0, limits.analyzeLimit);
}
