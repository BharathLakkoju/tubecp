import { NextRequest, NextResponse } from "next/server";
import { expandQueries } from "@/lib/services/query-expansion";
import { requireUserId, apiError } from "@/lib/auth";
import { assertUsageAvailable, getUserSubscription } from "@/lib/billing/subscription";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import { rateLimitApi } from "@/lib/ratelimit";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-expand", 20);

    const { topic } = (await req.json()) as { topic?: string };
    if (!topic?.trim()) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    await assertUsageAvailable(userId, "research");

    const sub = await getUserSubscription(userId);
    const limits = getResearchPipelineLimits(sub.plan);
    const queries = await expandQueries(topic, { maxQueries: limits.search.maxExpandedQueries });

    return NextResponse.json({ queries, cached: false });
  } catch (err) {
    return apiError(err);
  }
}
