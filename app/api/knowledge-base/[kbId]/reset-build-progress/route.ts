import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan } from "@/lib/plans";
import { resetKbBuildJobProgress } from "@/lib/services/kb-build-job";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await context.params;
    await assertKbAccess(kbId, userId);

    const sub = await getUserSubscription(userId);
    const persistent = getPlan(sub.plan).persistentKbs;

    await resetKbBuildJobProgress(kbId, persistent);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
