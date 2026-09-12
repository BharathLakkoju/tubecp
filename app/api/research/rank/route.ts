import { NextRequest, NextResponse } from "next/server";
import { rankVideos } from "@/lib/services/relevance";
import { requireUserId, apiError } from "@/lib/auth";
import { checkAndIncrementUsage, getUserSubscription } from "@/lib/billing/subscription";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import { rateLimitApi } from "@/lib/ratelimit";
import type { VideoAnalysis, VideoCandidate } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-rank", 20);

    const { topic, queriesUsed, videosSearched, analyses, allCandidates } = (await req.json()) as {
      topic?: string;
      queriesUsed?: string[];
      videosSearched?: number;
      analyses?: Array<{ video: VideoCandidate; analysis: VideoAnalysis }>;
      allCandidates?: VideoCandidate[];
    };

    if (!topic || !queriesUsed || !analyses) {
      return NextResponse.json(
        { error: "topic, queriesUsed, and analyses are required" },
        { status: 400 }
      );
    }

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

    await checkAndIncrementUsage(userId, "research");

    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
