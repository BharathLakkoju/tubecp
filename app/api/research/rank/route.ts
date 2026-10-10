import { NextRequest, NextResponse } from "next/server";
import { rankVideos } from "@/lib/services/relevance";
import { requireUserId, apiError } from "@/lib/auth";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import { assertResearchSession, saveResearchCheckpoint } from "@/lib/research-session";
import { rateLimitApi } from "@/lib/ratelimit";
import { persistUserResearch } from "@/lib/services/saved-research";
import { cacheResearchResult, researchResultCacheKey } from "@/lib/store";
import type { VideoAnalysis, VideoCandidate } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-rank", 20);

    const { topic, queriesUsed, videosSearched, analyses, allCandidates, researchSessionId } =
      (await req.json()) as {
        topic?: string;
        queriesUsed?: string[];
        videosSearched?: number;
        analyses?: Array<{ video: VideoCandidate; analysis: VideoAnalysis }>;
        allCandidates?: VideoCandidate[];
        researchSessionId?: string;
      };

    if (!topic || !queriesUsed || !analyses) {
      return NextResponse.json(
        { error: "topic, queriesUsed, and analyses are required" },
        { status: 400 }
      );
    }

    await assertResearchSession(userId, researchSessionId);

    const sub = await getUserSubscription(userId);
    const limits = getResearchPipelineLimits(sub.plan);

    const result = rankVideos(
      topic,
      queriesUsed,
      videosSearched ?? analyses.length,
      analyses,
      limits.maxResults,
      allCandidates ?? []
    );

    await cacheResearchResult(researchResultCacheKey(sub.plan, topic), result);

    if (researchSessionId) {
      await saveResearchCheckpoint(researchSessionId, {
        topic,
        stage: "ranked",
        queries: queriesUsed,
        allCandidates,
        videosSearched: videosSearched ?? analyses.length,
        analyses,
        result,
        updatedAt: new Date().toISOString(),
      });
      await persistUserResearch(userId, researchSessionId, result);
    }

    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
