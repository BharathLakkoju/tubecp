import type { SavedResearch, SavedResearchRecord } from "./types";

const KB_RESEARCH_ID_PREFIX = "kb:";

export function knowledgeBaseIdFromResearchId(researchId: string): string | null {
  if (!researchId.startsWith(KB_RESEARCH_ID_PREFIX)) return null;
  return researchId.slice(KB_RESEARCH_ID_PREFIX.length);
}

/** Saved-research rows mirrored from a knowledge base (shown under Knowledge bases, not Researches). */
export function isKbMirrorResearchId(researchId: string): boolean {
  return knowledgeBaseIdFromResearchId(researchId) !== null;
}

export function listableSavedResearches<T extends { researchId: string }>(items: T[]): T[] {
  return items.filter((item) => !isKbMirrorResearchId(item.researchId));
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
