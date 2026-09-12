import { NextRequest, NextResponse } from "next/server";
import { expandQueries } from "@/lib/services/query-expansion";
import { getCachedExpandedQueries, hashTopic } from "@/lib/store";
import { requireUserId, apiError } from "@/lib/auth";
import { assertUsageAvailable } from "@/lib/billing/subscription";
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

    const topicHash = hashTopic(topic.toLowerCase().trim());
    const cached = await getCachedExpandedQueries(topicHash);

    if (cached?.length) {
      return NextResponse.json({ queries: cached, cached: true });
    }

    const queries = await expandQueries(topic);
    return NextResponse.json({ queries, cached: false });
  } catch (err) {
    return apiError(err);
  }
}
