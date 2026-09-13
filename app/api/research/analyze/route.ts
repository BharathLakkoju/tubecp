import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/services/relevance";
import { requireUserId, apiError } from "@/lib/auth";
import { assertResearchSession, getResearchCheckpoint, saveResearchCheckpoint } from "@/lib/research-session";
import { rateLimitApi } from "@/lib/ratelimit";
import type { VideoCandidate } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "research-analyze", 40);

    const { video, topic, researchSessionId } = (await req.json()) as {
      video?: VideoCandidate;
      topic?: string;
      researchSessionId?: string;
    };

    if (!video || !topic?.trim()) {
      return NextResponse.json({ error: "video and topic are required" }, { status: 400 });
    }

    await assertResearchSession(userId, researchSessionId);

    const analysis = await analyzeVideo(video, topic);

    if (researchSessionId) {
      const checkpoint = await getResearchCheckpoint(userId, researchSessionId);
      const analyses = [...(checkpoint?.analyses ?? [])];
      const existingIndex = analyses.findIndex((item) => item.video.videoId === video.videoId);
      const entry = { video, analysis };
      if (existingIndex >= 0) {
        analyses[existingIndex] = entry;
      } else {
        analyses.push(entry);
      }

      await saveResearchCheckpoint(researchSessionId, {
        topic: topic.trim(),
        stage: "analyzed",
        queries: checkpoint?.queries,
        candidates: checkpoint?.candidates,
        allCandidates: checkpoint?.allCandidates,
        videosSearched: checkpoint?.videosSearched,
        analyses,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ video, analysis });
  } catch (err) {
    return apiError(err);
  }
}
