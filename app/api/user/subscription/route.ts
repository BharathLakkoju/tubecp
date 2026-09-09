import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPlan, PLANS } from "@/lib/plans";

export async function GET() {
  try {
    const userId = await requireUserId();
    const sub = await getUserSubscription(userId);
    const plan = getPlan(sub.plan);

    return NextResponse.json({
      subscription: sub,
      plan,
      limits: {
        kbBuildsPerMonth: plan.kbBuildsPerMonth,
        chatMessagesPerMonth: plan.chatMessagesPerMonth,
        researchPerDay: plan.researchPerDay,
      },
      usage: {
        kbBuildsUsed: sub.kbBuildsUsed,
        chatMessagesUsed: sub.chatMessagesUsed,
        researchUsedToday: sub.researchUsedToday,
      },
      availablePlans: Object.values(PLANS).map((p) => ({
        id: p.id,
        name: p.name,
        priceMonthly: p.priceMonthly,
        kbBuildsPerMonth: p.kbBuildsPerMonth,
        chatMessagesPerMonth: p.chatMessagesPerMonth,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}
