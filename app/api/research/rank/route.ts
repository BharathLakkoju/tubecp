import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import { assertResearchSession, getResearchCheckpoint, saveResearchCheckpoint } from "@/lib/research-session";
import { rateLimitApi } from "@/lib/ratelimit";
import { persistUserResearch } from "@/lib/services/saved-research";
import { orderSelection, selectionNeedsRetry, type VideoState } from "@/lib/services/selection";
import { cacheResearchResult, researchResultCacheKey } from "@/lib/store";
import { toVideoSummary } from "@/lib/youtube";
import type { VideoCandidate } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-rank", 20);

    const { topic, queriesUsed, videosSearched, states, allCandidates, researchSessionId } =
      (await req.json()) as {
        topic?: string;
        queriesUsed?: string[];
        videosSearched?: number;
        states?: VideoState[];
        allCandidates?: VideoCandidate[];
        researchSessionId?: string;
      };

    if (!topic || !queriesUsed || !states) {
      return NextResponse.json(
        { error: "topic, queriesUsed, and states are required" },
        { status: 400 }
      );
    }

    await assertResearchSession(userId, researchSessionId);
    const checkpoint = researchSessionId
      ? await getResearchCheckpoint(userId, researchSessionId)
      : null;

    const sub = await getUserSubscription(userId);
    const limits = getResearchPipelineLimits(sub.plan);
    const scraped = allCandidates ?? [];

    const result = orderSelection({
      topic,
      queriesUsed,
      videosSearched: videosSearched ?? scraped.length,
      allVideos: scraped.map(toVideoSummary),
      assessments: states,
      pastAnalyzeCap: checkpoint?.pastAnalyzeCap ?? [],
      pastSearchCap: checkpoint?.pastSearchCap ?? [],
      maxResults: limits.maxResults,
    });

    if (!selectionNeedsRetry(result)) {
      await cacheResearchResult(researchResultCacheKey(sub.plan, topic), result);
    }

    if (researchSessionId) {
      await saveResearchCheckpoint(researchSessionId, {
        topic,
        stage: "ranked",
        queries: queriesUsed,
        allCandidates: scraped,
        videosSearched: result.videosSearched,
        states,
        pastAnalyzeCap: checkpoint?.pastAnalyzeCap,
        pastSearchCap: checkpoint?.pastSearchCap,
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
