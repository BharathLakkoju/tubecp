import { after, NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { checkAndIncrementUsage, getUserSubscription } from "@/lib/billing/subscription";
import { isE2eStubMode } from "@/lib/e2e-stub";
import { getPlan } from "@/lib/plans";
import { rateLimitApi } from "@/lib/ratelimit";
import { ensureKbWelcomeMessage } from "@/lib/services/kb-chat";
import {
  runKnowledgeBaseBuildJob,
  startKnowledgeBaseBuild,
} from "@/lib/services/kb-build-job";
import type { RankedVideo } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "kb-build", 5);

    const { topic, rankedVideos } = (await req.json()) as {
      topic?: string;
      rankedVideos?: RankedVideo[];
    };

    if (!topic?.trim() || !rankedVideos?.length) {
      return NextResponse.json({ error: "topic and rankedVideos are required" }, { status: 400 });
    }

    if (!isE2eStubMode()) {
      await checkAndIncrementUsage(userId, "kb_build");
    }

    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    const kb = await startKnowledgeBaseBuild(topic, rankedVideos, userId, persistent);

    if (kb.status === "ready") {
      await ensureKbWelcomeMessage(kb.kbId);
      return NextResponse.json({ kb, skippedVideos: [], async: false });
    }

    after(() => {
      runKnowledgeBaseBuildJob(kb.kbId, persistent).catch((err) => {
        console.error(`KB build job failed for ${kb.kbId}:`, err);
      });
    });

    return NextResponse.json(
      { kb, skippedVideos: [], async: true },
      { status: 202 }
    );
  } catch (err) {
    return apiError(err);
  }
}
