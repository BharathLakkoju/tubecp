import type { SavedResearch, SavedResearchRecord } from "./types";

const KB_RESEARCH_ID_PREFIX = "kb:";

export function knowledgeBaseIdFromResearchId(researchId: string): string | null {
  if (!researchId.startsWith(KB_RESEARCH_ID_PREFIX)) return null;
  return researchId.slice(KB_RESEARCH_ID_PREFIX.length);
}

export function hrefForSavedResearch(researchId: string): string {
  const kbId = knowledgeBaseIdFromResearchId(researchId);
  if (kbId) return `/app/kb/${kbId}`;
  return `/app/researches/${encodeURIComponent(researchId)}`;
}

export function toSavedResearchSummary(record: SavedResearchRecord): SavedResearch {
  return {
    researchId: record.researchId,
    topic: record.topic,
    createdAt: record.createdAt,
    rankedVideoCount: record.rankedVideoCount,
    videosSearched: record.videosSearched,
  };
}
