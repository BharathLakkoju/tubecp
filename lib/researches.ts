import type { SavedResearch, SavedResearchRecord } from "./types";

export function toSavedResearchSummary(record: SavedResearchRecord): SavedResearch {
  return {
    researchId: record.researchId,
    topic: record.topic,
    createdAt: record.createdAt,
    rankedVideoCount: record.rankedVideoCount,
    videosSearched: record.videosSearched,
  };
}
