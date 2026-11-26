import { NextRequest, NextResponse } from "next/server";
import { searchYouTubeMultiple } from "@/lib/services/youtube-search";
import { tagSearchQueries } from "@/lib/services/query-expansion";
import { queueForReading } from "@/lib/services/recall";
import { cacheQueries, hashTopic } from "@/lib/store";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import { getUserSubscription } from "@/lib/billing/subscription";
import { requireUserId, apiError } from "@/lib/auth";
import { assertResearchSession, saveResearchCheckpoint } from "@/lib/research-session";
import { rateLimitApi } from "@/lib/ratelimit";
import type { DateRange } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-search", 20);

    const { topic, queries, dateRange, researchSessionId } = (await req.json()) as {
      topic?: string;
      queries?: string[];
      dateRange?: DateRange;
      researchSessionId?: string;
    };

    if (!queries?.length || !topic?.trim()) {
      return NextResponse.json({ error: "topic and queries are required" }, { status: 400 });
    }

    await assertResearchSession(userId, researchSessionId);

    const sub = await getUserSubscription(userId);
    const limits = getResearchPipelineLimits(sub.plan);

    const tagged = tagSearchQueries(topic, queries);
    const allCandidates = await searchYouTubeMultiple(
      tagged.map((query) => query.text),
      dateRange,
      limits.search,
      userId,
      { queryKinds: tagged.map((query) => query.kind) }
    );
    const queue = queueForReading(allCandidates, limits);
    const candidates = queue.toRead;

    const topicHash = hashTopic(topic.toLowerCase().trim());
    await cacheQueries(topicHash, queries, allCandidates.map((v) => v.videoId));

    if (researchSessionId) {
      await saveResearchCheckpoint(researchSessionId, {
        topic: topic.trim(),
        stage: "searched",
        queries,
        candidates,
        allCandidates,
        pastAnalyzeCap: queue.pastAnalyzeCap,
        pastSearchCap: queue.pastSearchCap,
        videosSearched: allCandidates.length,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      candidates,
      allCandidates,
      pastAnalyzeCap: queue.pastAnalyzeCap,
      pastSearchCap: queue.pastSearchCap,
      videosSearched: allCandidates.length,
      pipelineLimits: limits,
    });
  } catch (err) {
    return apiError(err);
  }
}
