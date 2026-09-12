import { NextRequest, NextResponse } from "next/server";
import { searchYouTubeMultiple } from "@/lib/services/youtube-search";
import { preRankCandidates } from "@/lib/services/relevance";
import { selectCandidatesForAnalysis } from "@/lib/services/research-scoring";
import { cacheQueries, hashTopic } from "@/lib/store";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import { getUserSubscription } from "@/lib/billing/subscription";
import { requireUserId, apiError } from "@/lib/auth";
import { rateLimitApi } from "@/lib/ratelimit";
import type { DateRange } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-search", 20);

    const { topic, queries, dateRange } = (await req.json()) as {
      topic?: string;
      queries?: string[];
      dateRange?: DateRange;
    };

    if (!queries?.length || !topic?.trim()) {
      return NextResponse.json({ error: "topic and queries are required" }, { status: 400 });
    }

    const sub = await getUserSubscription(userId);
    const limits = getResearchPipelineLimits(sub.plan);

    const allCandidates = await searchYouTubeMultiple(queries, dateRange, limits.search);
    const preRanked =
      allCandidates.length <= limits.preRankLimit
        ? allCandidates
        : await preRankCandidates(topic, allCandidates, limits.preRankLimit).catch((err) => {
            console.warn("Pre-rank failed, returning unranked candidates:", err);
            return allCandidates.slice(0, limits.preRankLimit);
          });

    const candidates = selectCandidatesForAnalysis(topic, preRanked, limits);

    const topicHash = hashTopic(topic.toLowerCase().trim());
    await cacheQueries(topicHash, queries, allCandidates.map((v) => v.videoId));

    return NextResponse.json({
      candidates,
      allCandidates,
      videosSearched: allCandidates.length,
      pipelineLimits: limits,
    });
  } catch (err) {
    return apiError(err);
  }
}
