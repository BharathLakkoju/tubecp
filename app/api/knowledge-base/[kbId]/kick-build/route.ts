import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import { knowledgeBaseBuildStatus, runKnowledgeBaseBuildJob } from "@/lib/services/kb-build-job";

export const maxDuration = 60;

/** Re-enqueue a stalled `building` knowledge base on the durable runner. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const { kbId } = await params;
    const userId = await requireUserId();
    await rateLimitApi(userId, "kb-kick", 30);
    const kb = await assertKbAccess(kbId, userId);
    if (kb.status !== "building") {
      return NextResponse.json(
        { error: "Only in-progress knowledge bases can be resumed on the server." },
        { status: 400 }
      );
    }
    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    const result = await runKnowledgeBaseBuildJob(kbId, persistent);
    const updated = result.kb;
    return NextResponse.json({
      kb: updated,
      buildStatus: knowledgeBaseBuildStatus(updated),
      async: updated.status === "building",
    });
  } catch (err) {
    return apiError(err);
  }
}
