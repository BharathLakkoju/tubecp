import { NextRequest, NextResponse } from "next/server";
import { expandQueries } from "@/lib/services/query-expansion";
import { requireUserId, apiError } from "@/lib/auth";
import { checkAndIncrementUsage, getUserSubscription } from "@/lib/billing/subscription";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import { createResearchSession, saveResearchCheckpoint } from "@/lib/research-session";
import { rateLimitApi } from "@/lib/ratelimit";
import { isE2eStubMode, stubExpandedQueries, stubResearchResult } from "@/lib/e2e-stub";
import {
  getCachedResearchResult,
  researchResultCacheKey,
} from "@/lib/store";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-expand", 20);

    const { topic } = (await req.json()) as { topic?: string };
    if (!topic?.trim()) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    if (isE2eStubMode()) {
      const researchSessionId = await createResearchSession(userId);
      const research = stubResearchResult(topic.trim());
      return NextResponse.json({
        queries: stubExpandedQueries(topic.trim()),
        researchSessionId,
        cached: true,
        research,
      });
    }

    const sub = await getUserSubscription(userId);
    const limits = getResearchPipelineLimits(sub.plan);
    const cacheKey = researchResultCacheKey(sub.plan, topic);
    const cachedResearch = await getCachedResearchResult(cacheKey);

    if (cachedResearch) {
      const researchSessionId = await createResearchSession(userId);
      return NextResponse.json({
        queries: cachedResearch.queriesUsed,
        researchSessionId,
        cached: true,
        research: cachedResearch,
      });
    }

    const { queries, cached } = await expandQueries(topic, {
      maxQueries: limits.search.maxExpandedQueries,
      usageUserId: userId,
    });
    const researchSessionId = await createResearchSession(userId);

    if (!cached) {
      await checkAndIncrementUsage(userId, "research");
    }

    await saveResearchCheckpoint(researchSessionId, {
      topic: topic.trim(),
      stage: "expanded",
      queries,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ queries, researchSessionId, cached });
  } catch (err) {
    return apiError(err);
  }
}
