import { NextRequest, NextResponse } from "next/server";
import { recordKbBuildVideoProgress } from "@/lib/services/kb-build-job";
import { indexVideoInKnowledgeBase } from "@/lib/services/knowledge-base";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import type { RankedVideo } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "kb-index", 30);

    const { kbId, video } = (await req.json()) as {
      kbId?: string;
      video?: RankedVideo;
    };

    if (!kbId || !video) {
      return NextResponse.json({ error: "kbId and video are required" }, { status: 400 });
    }

    await assertKbAccess(kbId, userId);

    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    const result = await indexVideoInKnowledgeBase(kbId, video, persistent);
    await recordKbBuildVideoProgress(kbId, persistent, video.title, result.skipped);
    return NextResponse.json({
      kb: result.kb,
      skipped: result.skipped,
      skipReason: result.skipReason,
      videoId: video.videoId,
      videoTitle: video.title,
    });
  } catch (err) {
    return apiError(err);
  }
}
