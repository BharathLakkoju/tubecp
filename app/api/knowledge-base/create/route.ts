import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { checkAndIncrementUsage, getUserSubscription } from "@/lib/billing/subscription";
import { kbPipelineForUser } from "@/lib/pipeline/config";
import { assertCanStartBuild } from "@/lib/pipeline/limits";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import { startKnowledgeBaseBuild } from "@/lib/services/kb-build-job";
import type { KbTranscriptMode, RankedVideo } from "@/lib/types";

export const maxDuration = 60;

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

    const queue = kbPipelineForUser(userId) === "queue";
    if (queue) {
      await assertCanStartBuild(userId);
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

    const kb = await startKnowledgeBaseBuild(topic, rankedVideos, userId, persistent, {
      transcriptMode: mode,
    });

    return NextResponse.json({
      kbId: kb.kbId,
      kb,
      async: queue && kb.status === "building",
    });
  } catch (err) {
    return apiError(err);
  }
}
