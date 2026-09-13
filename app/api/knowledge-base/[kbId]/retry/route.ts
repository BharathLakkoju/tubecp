import { after, NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import {
  knowledgeBaseBuildStatus,
  runKnowledgeBaseBuildJob,
} from "@/lib/services/kb-build-job";
import { updateKnowledgeBase } from "@/lib/store";

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    await rateLimitApi(userId, "kb-retry", 5);
    const kb = await assertKbAccess(kbId, userId);

    if (kb.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed knowledge bases can be retried." },
        { status: 400 }
      );
    }

    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    await updateKnowledgeBase(
      kbId,
      (current) => ({
        ...current,
        status: "building",
        buildJob: {
          totalVideos: current.rankedVideos?.length ?? 0,
          processedVideos: 0,
          skippedCount: 0,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      persistent
    );

    after(() => {
      runKnowledgeBaseBuildJob(kbId, persistent).catch((err) => {
        console.error(`KB retry job failed for ${kbId}:`, err);
      });
    });

    const updated = await assertKbAccess(kbId, userId);
    return NextResponse.json(
      {
        kb: updated,
        buildStatus: knowledgeBaseBuildStatus(updated),
        skippedVideos: [],
        async: true,
      },
      { status: 202 }
    );
  } catch (err) {
    return apiError(err);
  }
}
