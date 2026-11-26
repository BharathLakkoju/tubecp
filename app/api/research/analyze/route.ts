import { NextRequest, NextResponse } from "next/server";
import { assessVideo } from "@/lib/services/selection";
import { requireUserId, apiError } from "@/lib/auth";
import { assertResearchSession, getResearchCheckpoint, saveResearchCheckpoint } from "@/lib/research-session";
import { rateLimitApi } from "@/lib/ratelimit";
import type { VideoCandidate } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-analyze", 80);

    const { video, topic, researchSessionId } = (await req.json()) as {
      video?: VideoCandidate;
      topic?: string;
      researchSessionId?: string;
    };

    if (!video || !topic?.trim()) {
      return NextResponse.json({ error: "video and topic are required" }, { status: 400 });
    }

    await assertResearchSession(userId, researchSessionId);

    const state = await assessVideo(video, topic);

    if (researchSessionId) {
      const checkpoint = await getResearchCheckpoint(userId, researchSessionId);
      const states = [...(checkpoint?.states ?? [])];
      const existingIndex = states.findIndex((item) => item.video.videoId === video.videoId);
      if (existingIndex >= 0) states[existingIndex] = state;
      else states.push(state);

      await saveResearchCheckpoint(researchSessionId, {
        topic: topic.trim(),
        stage: "analyzed",
        queries: checkpoint?.queries,
        candidates: checkpoint?.candidates,
        allCandidates: checkpoint?.allCandidates,
        videosSearched: checkpoint?.videosSearched,
        pastAnalyzeCap: checkpoint?.pastAnalyzeCap,
        pastSearchCap: checkpoint?.pastSearchCap,
        states,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ video, state });
  } catch (err) {
    return apiError(err);
  }
}
