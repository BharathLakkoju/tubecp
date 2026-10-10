import { NextRequest, NextResponse } from "next/server";
import { createKnowledgeBase } from "@/lib/services/knowledge-base";
import { createInitialBuildJob } from "@/lib/services/kb-build-job";
import { addUserKnowledgeBase, updateKnowledgeBase } from "@/lib/store";
import { requireUserId, apiError } from "@/lib/auth";
import { checkAndIncrementUsage, getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import type { KbTranscriptMode, RankedVideo } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "kb-create", 10);

    const { topic, rankedVideos, transcriptMode, useSpeechToText } = (await req.json()) as {
      topic?: string;
      rankedVideos?: RankedVideo[];
      transcriptMode?: KbTranscriptMode;
      useSpeechToText?: boolean;
    };

    if (!topic?.trim() || !rankedVideos?.length) {
      return NextResponse.json({ error: "topic and rankedVideos are required" }, { status: 400 });
    }

    await checkAndIncrementUsage(userId, "kb_build");

    const sub = await getUserSubscription(userId);
    const plan = getPlan(sub.plan);
    const persistent = plan.persistentKbs;

    const mode: KbTranscriptMode =
      transcriptMode ?? (useSpeechToText ? "stt" : "captions");
    if (mode !== "captions" && mode !== "stt") {
      return NextResponse.json({ error: "Invalid transcriptMode" }, { status: 400 });
    }

    const kb = await createKnowledgeBase(topic, rankedVideos, userId, persistent, {
      transcriptMode: mode,
    });
    kb.buildJob = createInitialBuildJob(rankedVideos.length);
    await updateKnowledgeBase(kb.kbId, () => kb, persistent);
    await addUserKnowledgeBase(userId, kb.kbId);

    return NextResponse.json({ kbId: kb.kbId, kb });
  } catch (err) {
    return apiError(err);
  }
}
