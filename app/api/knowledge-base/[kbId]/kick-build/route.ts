import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import { withJobProgress } from "@/lib/kb/progress";
import { knowledgeBaseBuildStatus, runKnowledgeBaseBuildJob } from "@/lib/kb/orchestrator";

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
    if (kb.status !== "building" && kb.status !== "finalizing") {
      return NextResponse.json(
        { error: "Only in-progress knowledge bases can be resumed on the server." },
        { status: 400 }
      );
    }
    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    const result = await runKnowledgeBaseBuildJob(kbId, persistent);
    const updated = await withJobProgress(result.kb);
    return NextResponse.json({
      kb: updated,
      buildStatus: knowledgeBaseBuildStatus(updated),
      async: updated.status === "building" || updated.status === "finalizing",
    });
  } catch (err) {
    return apiError(err);
  }
}
