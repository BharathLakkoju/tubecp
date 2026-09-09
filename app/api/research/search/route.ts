import { NextRequest, NextResponse } from "next/server";
import { searchYouTubeMultiple } from "@/lib/services/youtube-search";
import { preRankCandidates } from "@/lib/services/relevance";
import { cacheQueries, hashTopic } from "@/lib/store";
import { PRE_RANK_LIMIT } from "@/lib/constants/research";
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

    const allCandidates = await searchYouTubeMultiple(queries, dateRange, 15);
    const candidates = await preRankCandidates(topic, allCandidates, PRE_RANK_LIMIT);

    const topicHash = hashTopic(topic.toLowerCase().trim());
    await cacheQueries(topicHash, queries, allCandidates.map((v) => v.videoId));

    return NextResponse.json({
      candidates,
      videosSearched: allCandidates.length,
    });
  } catch (err) {
    return apiError(err);
  }
}
