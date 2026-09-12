import { NextRequest, NextResponse } from "next/server";
import { finalizeKnowledgeBase } from "@/lib/services/knowledge-base";
import { ensureKbWelcomeMessage } from "@/lib/services/kb-chat";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();

    const { kbId } = (await req.json()) as { kbId?: string };
    if (!kbId) {
      return NextResponse.json({ error: "kbId is required" }, { status: 400 });
    }

    await assertKbAccess(kbId, userId);

    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    const kb = await finalizeKnowledgeBase(kbId, persistent);

    await ensureKbWelcomeMessage(kbId);

    return NextResponse.json({ kb });
  } catch (err) {
    return apiError(err);
  }
}
