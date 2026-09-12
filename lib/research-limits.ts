import type { PlanId } from "./plans";
import { getPlan } from "./plans";

export interface ResearchPipelineLimits {
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
    preRankLimit: 40,
    analyzeLimit: 28,
    maxResults: 15,
    analyzeAllWorthy: false,
  },
  pro: {
    preRankLimit: 55,
    analyzeLimit: 45,
    maxResults: 40,
    analyzeAllWorthy: true,
  },
  researcher: {
    preRankLimit: 75,
    analyzeLimit: 60,
    maxResults: 60,
    analyzeAllWorthy: true,
  },
};

export function getResearchPipelineLimits(planId: string | undefined): ResearchPipelineLimits {
  const plan = getPlan(planId);
  return LIMITS[plan.id];
}
