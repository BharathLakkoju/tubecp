import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { checkAndIncrementUsage, getUserSubscription } from "@/lib/billing/subscription";
import { isE2eStubMode } from "@/lib/e2e-stub";
import { withJobProgress } from "@/lib/kb/progress";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import { ensureKbWelcomeMessage } from "@/lib/services/kb-chat";
import { startKnowledgeBaseBuild } from "@/lib/kb/orchestrator";
import { persistUserResearch } from "@/lib/services/saved-research";
import { assertResearchAccess } from "@/lib/research-access";
import { getKnowledgeBase } from "@/lib/store";
import type { KbTranscriptMode, RankedVideo } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "kb-build", 5);

    const { topic, rankedVideos, transcriptMode, useSpeechToText, researchId } = (await req.json()) as {
      topic?: string;
      rankedVideos?: RankedVideo[];
      transcriptMode?: KbTranscriptMode;
      useSpeechToText?: boolean;
      researchId?: string;
    };

    if (!topic?.trim() || !rankedVideos?.length) {
      return NextResponse.json({ error: "topic and rankedVideos are required" }, { status: 400 });
    }

    if (!isE2eStubMode()) {
      await checkAndIncrementUsage(userId, "kb_build");
    }

    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    const mode: KbTranscriptMode =
      transcriptMode ?? (useSpeechToText ? "stt" : "captions");
    if (mode !== "captions" && mode !== "stt") {
      return NextResponse.json({ error: "Invalid transcriptMode" }, { status: 400 });
    }

    const linkedResearch = researchId?.trim()
      ? await assertResearchAccess(researchId.trim(), userId)
      : null;

    let videosForBuild = rankedVideos;
    if (linkedResearch?.result.speechSelection) {
      const allowed = new Set(linkedResearch.result.rankedVideos.map((video) => video.videoId));
      videosForBuild = rankedVideos.filter((video) => allowed.has(video.videoId));
      if (videosForBuild.length === 0) {
        return NextResponse.json(
          { error: "Only videos whose transcript discusses the topic can be indexed" },
          { status: 400 }
        );
      }
    }

    const kb = await startKnowledgeBaseBuild(topic, videosForBuild, userId, persistent, {
      transcriptMode: mode,
    });

    if (linkedResearch) {
      await persistUserResearch(userId, linkedResearch.researchId, linkedResearch.result, kb.kbId);
    }

    if (kb.status === "ready") {
      await ensureKbWelcomeMessage(kb.kbId);
      return NextResponse.json({ kb, skippedVideos: [], async: false });
    }

    const latest = await withJobProgress((await getKnowledgeBase(kb.kbId)) ?? kb);
    return NextResponse.json(
      { kb: latest, skippedVideos: [], async: true },
      { status: 202 }
    );
  } catch (err) {
    return apiError(err);
  }
}
