import { after, NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import { knowledgeBaseBuildStatus, runKnowledgeBaseBuildJob } from "@/lib/services/kb-build-job";

export const maxDuration = 30;

/** Resume server-side indexing when status is still `building`. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    await rateLimitApi(userId, "kb-kick", 10);

    const kb = await assertKbAccess(kbId, userId);
    if (kb.status !== "building") {
      return NextResponse.json(
        { error: "Only in-progress knowledge bases can be resumed on the server." },
        { status: 400 }
      );
    }

    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    after(() => {
      runKnowledgeBaseBuildJob(kbId, persistent).catch((err) => {
        console.error(`KB kick-build failed for ${kbId}:`, err);
      });
    });

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
