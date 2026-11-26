import type { QueryKind, SearchMatch, VideoCandidate } from "@/lib/types";
import type { ResearchPipelineLimits } from "@/lib/research-limits";

export type RecallLimits = Pick<ResearchPipelineLimits, "preRankLimit" | "analyzeLimit">;

export type ReadQueue = {
  toRead: VideoCandidate[];
  pastAnalyzeCap: VideoCandidate[];
  pastSearchCap: VideoCandidate[];
};

function matchesOf(video: VideoCandidate, kind: QueryKind): SearchMatch[] {
  return (video.matches ?? []).filter((match) => match.kind === kind);
}

function bestRank(matches: SearchMatch[]): number | null {
  if (matches.length === 0) return null;
  return Math.min(...matches.map((match) => match.rank));
}

function nameOnly(video: VideoCandidate): boolean {
  const matches = video.matches ?? [];
  return matches.length > 0 && matches.every((match) => match.kind === "name");
}

/** Order videos for a transcript read. Title words are not a key. */
export function compareRecall(a: VideoCandidate, b: VideoCandidate): number {
  const topicA = bestRank(matchesOf(a, "topic"));
  const topicB = bestRank(matchesOf(b, "topic"));
  if ((topicA == null) !== (topicB == null)) return topicA == null ? 1 : -1;

  const subjectA = bestRank(matchesOf(a, "subject"));
  const subjectB = bestRank(matchesOf(b, "subject"));
  if ((subjectA == null) !== (subjectB == null)) return subjectA == null ? 1 : -1;

  const countA = a.matches?.length ?? a.matchedQueries ?? 0;
  const countB = b.matches?.length ?? b.matchedQueries ?? 0;
  if (countA !== countB) return countB - countA;

  const rankA = a.searchRank ?? bestRank(a.matches ?? []) ?? Number.MAX_SAFE_INTEGER;
  const rankB = b.searchRank ?? bestRank(b.matches ?? []) ?? Number.MAX_SAFE_INTEGER;
  if (rankA !== rankB) return rankA - rankB;

  if (nameOnly(a) !== nameOnly(b)) return nameOnly(a) ? 1 : -1;
  return 0;
}

export function queueForReading(hits: VideoCandidate[], limits: RecallLimits): ReadQueue {
  const ordered = [...hits].sort(compareRecall);
  const kept = ordered.slice(0, limits.preRankLimit);
  return {
    toRead: kept.slice(0, limits.analyzeLimit),
    pastAnalyzeCap: kept.slice(limits.analyzeLimit),
    pastSearchCap: ordered.slice(limits.preRankLimit),
  };
}
