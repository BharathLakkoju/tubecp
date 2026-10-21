import { after, NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import {
  isKbBuildContinuation,
  KB_BUILD_CONTINUATION_HEADER,
} from "@/lib/services/kb-build-continue";
import { knowledgeBaseBuildStatus, runKnowledgeBaseBuildJob } from "@/lib/services/kb-build-job";
import { getKnowledgeBase } from "@/lib/store";

export const maxDuration = 300;

/** Resume server-side indexing when status is still `building`. One video per invocation. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const { kbId } = await params;
    const internal = isKbBuildContinuation(kbId, req.headers.get(KB_BUILD_CONTINUATION_HEADER));

    let persistent: boolean;
    let userId: string | null = null;
    if (internal) {
      const kb = await getKnowledgeBase(kbId);
      if (!kb || kb.status !== "building") {
        return NextResponse.json({ ok: true, skipped: true });
      }
      const sub = await getUserSubscription(kb.userId);
      persistent = getPlan(sub.plan).persistentKbs;
    } else {
      userId = await requireUserId();
      await rateLimitApi(userId, "kb-kick", 30);
      const kb = await assertKbAccess(kbId, userId);
      if (kb.status !== "building") {
        return NextResponse.json(
          { error: "Only in-progress knowledge bases can be resumed on the server." },
          { status: 400 }
        );
      }
      const sub = await getUserSubscription(userId);
      persistent = getPlan(sub.plan).persistentKbs;
    }

    after(() => {
      runKnowledgeBaseBuildJob(kbId, persistent).catch((err) => {
        console.error(`KB kick-build failed for ${kbId}:`, err);
      });
    });

    if (!userId) {
      return NextResponse.json({ ok: true, async: true });
    }

    const updated = await assertKbAccess(kbId, userId);
    return NextResponse.json({
      kb: updated,
      buildStatus: knowledgeBaseBuildStatus(updated),
      async: true,
    });
  } catch (err) {
    return apiError(err);
  }
}
