import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { withJobProgress } from "@/lib/kb/progress";
import { knowledgeBaseBuildStatus, runKnowledgeBaseRetryJob } from "@/lib/kb/orchestrator";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    await rateLimitApi(userId, "kb-retry", 5);
    const kb = await assertKbAccess(kbId, userId);

    if (kb.status === "building" || kb.status === "finalizing") {
      return NextResponse.json({ error: "A build is already in progress." }, { status: 409 });
    }

    if (kb.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed knowledge bases can be retried." },
        { status: 400 }
      );
    }

    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;
    const result = await runKnowledgeBaseRetryJob(kbId, userId, persistent);
    const updated = await withJobProgress(result.kb);
    return NextResponse.json({
      kb: updated,
      buildStatus: knowledgeBaseBuildStatus(updated),
      skippedVideos: result.skippedVideos,
      async: true,
    });
  } catch (err) {
    return apiError(err);
  }
}
