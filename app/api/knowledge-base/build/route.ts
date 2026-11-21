import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { checkAndIncrementUsage, getUserSubscription } from "@/lib/billing/subscription";
import { kbPipelineForUser } from "@/lib/pipeline/config";
import { assertCanStartBuild } from "@/lib/pipeline/limits";
import { isE2eStubMode } from "@/lib/e2e-stub";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import { ensureKbWelcomeMessage } from "@/lib/services/kb-chat";
import {
  runKnowledgeBaseBuildJob,
  startKnowledgeBaseBuild,
} from "@/lib/services/kb-build-job";
import { getKnowledgeBase } from "@/lib/store";
import type { KbTranscriptMode, RankedVideo } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "kb-build", 5);

    const { topic, rankedVideos, transcriptMode, useSpeechToText } = (await req.json()) as {
      topic?: string;
      rankedVideos?: RankedVideo[];
      transcriptMode?: KbTranscriptMode;
      useSpeechToText?: boolean;
    };

    if (!topic?.trim() || !rankedVideos?.length) {
      return NextResponse.json({ error: "topic and rankedVideos are required" }, { status: 400 });
    }

    if (!isE2eStubMode()) {
      if (kbPipelineForUser(userId) === "queue") {
        await assertCanStartBuild(userId);
      }
      await checkAndIncrementUsage(userId, "kb_build");
    }

    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    const mode: KbTranscriptMode =
      transcriptMode ?? (useSpeechToText ? "stt" : "captions");
    if (mode !== "captions" && mode !== "stt") {
      return NextResponse.json({ error: "Invalid transcriptMode" }, { status: 400 });
    }

    const kb = await startKnowledgeBaseBuild(topic, rankedVideos, userId, persistent, {
      transcriptMode: mode,
    });

    if (kb.status === "ready") {
      await ensureKbWelcomeMessage(kb.kbId);
      return NextResponse.json({ kb, skippedVideos: [], async: false });
    }

    if (kbPipelineForUser(userId) !== "queue") {
      await runKnowledgeBaseBuildJob(kb.kbId, persistent);
    }

    const latest = (await getKnowledgeBase(kb.kbId)) ?? kb;
    return NextResponse.json(
      { kb: latest, skippedVideos: [], async: latest.status === "building" },
      { status: latest.status === "building" ? 202 : 200 }
    );
  } catch (err) {
    return apiError(err);
  }
}
