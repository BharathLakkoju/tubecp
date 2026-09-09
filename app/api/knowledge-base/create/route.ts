import { NextRequest, NextResponse } from "next/server";
import { createKnowledgeBase } from "@/lib/services/knowledge-base";
import { addUserKnowledgeBase } from "@/lib/store";
import { requireUserId, apiError } from "@/lib/auth";
import { checkAndIncrementUsage, getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import type { RankedVideo } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "kb-create", 10);

    const { topic, rankedVideos } = (await req.json()) as {
      topic?: string;
      rankedVideos?: RankedVideo[];
    };

    if (!topic?.trim() || !rankedVideos?.length) {
      return NextResponse.json({ error: "topic and rankedVideos are required" }, { status: 400 });
    }

    await checkAndIncrementUsage(userId, "kb_build");

    const sub = await getUserSubscription(userId);
    const plan = getPlan(sub.plan);
    const persistent = plan.persistentKbs;

    const kb = await createKnowledgeBase(topic, rankedVideos, userId, persistent);
    await addUserKnowledgeBase(userId, kb.kbId);

    return NextResponse.json({ kbId: kb.kbId, kb });
  } catch (err) {
    return apiError(err);
  }
}
