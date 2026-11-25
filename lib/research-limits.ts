import type { PlanId } from "./plans";
import { getPlan } from "./plans";

export const RESEARCHER_UNIQUE_VIDEO_TARGET = 60;

export interface ResearchSearchLimits {
  /** Results fetched for the primary (topic) query. */
  primarySearchResults: number;
  /** Results fetched per secondary expanded query. */
  secondarySearchResults: number;
  /** How many secondary queries to run after the primary. */
  maxSecondaryQueries: number;
  /** Max total queries kept after expansion (includes the topic as primary). */
  maxExpandedQueries: number;
  targetUniqueResults: number;
  maxPrimaryPages: number;
}

export interface ResearchPipelineLimits {
  search: ResearchSearchLimits;
  /** Max unique videos kept after YouTube search + pre-rank. */
  preRankLimit: number;
  /** Max videos sent through transcript analysis (safety ceiling). */
  analyzeLimit: number;
  /** Max videos returned in ranked results. */
  maxResults: number;
  /** When true, analyze every pre-ranked candidate that passes the worthy bar. */
  analyzeAllWorthy: boolean;
}

const LIMITS: Record<PlanId, ResearchPipelineLimits> = {
  free: {
    search: {
      primarySearchResults: 20,
      secondarySearchResults: 8,
      maxSecondaryQueries: 2,
      maxExpandedQueries: 4,
      targetUniqueResults: 20,
      maxPrimaryPages: 1,
    },
    preRankLimit: 40,
    analyzeLimit: 28,
    maxResults: 15,
    analyzeAllWorthy: false,
  },
  pro: {
    search: {
      primarySearchResults: 25,
      secondarySearchResults: 10,
      maxSecondaryQueries: 3,
      maxExpandedQueries: 5,
      targetUniqueResults: 40,
      maxPrimaryPages: 1,
    },
    preRankLimit: 55,
    analyzeLimit: 45,
    maxResults: 40,
    analyzeAllWorthy: true,
  },
  researcher: {
    search: {
      primarySearchResults: 50,
      secondarySearchResults: 12,
      maxSecondaryQueries: 6,
      maxExpandedQueries: 8,
      targetUniqueResults: RESEARCHER_UNIQUE_VIDEO_TARGET,
      maxPrimaryPages: 2,
    },
    preRankLimit: 90,
    analyzeLimit: 65,
    maxResults: RESEARCHER_UNIQUE_VIDEO_TARGET,
    analyzeAllWorthy: true,
  },
  team: {
    search: {
      primarySearchResults: 50,
      secondarySearchResults: 12,
      maxSecondaryQueries: 6,
      maxExpandedQueries: 8,
      targetUniqueResults: RESEARCHER_UNIQUE_VIDEO_TARGET,
      maxPrimaryPages: 2,
    },
    preRankLimit: 90,
    analyzeLimit: 65,
    maxResults: RESEARCHER_UNIQUE_VIDEO_TARGET,
    analyzeAllWorthy: true,
  },
};

export function getResearchPipelineLimits(planId: string | undefined): ResearchPipelineLimits {
  const plan = getPlan(planId);
  return LIMITS[plan.id];
}

/** Upper bound on unique videos before deduplication overlap. */
export function maxSearchFetchCeiling(limits: ResearchPipelineLimits): number {
  const { search } = limits;
  return (
    search.maxPrimaryPages * search.primarySearchResults +
    search.maxSecondaryQueries * search.secondarySearchResults
  );
}
