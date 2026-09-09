import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/services/relevance";
import { requireUserId, apiError } from "@/lib/auth";
import { rateLimitApi } from "@/lib/ratelimit";
import type { VideoCandidate } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-analyze", 40);

    const { video, topic } = (await req.json()) as {
      video?: VideoCandidate;
      topic?: string;
    };

    if (!video || !topic?.trim()) {
      return NextResponse.json({ error: "video and topic are required" }, { status: 400 });
    }

    const analysis = await analyzeVideo(video, topic);
    return NextResponse.json({ video, analysis });
  } catch (err) {
    return apiError(err);
  }
}
