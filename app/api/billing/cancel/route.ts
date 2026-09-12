import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { getUserSubscription } from "@/lib/billing/subscription";
import { getPolarClient } from "@/lib/polar";

export async function POST() {
  try {
    const userId = await requireUserId();
    const sub = await getUserSubscription(userId);

    if (sub.plan === "free") {
      return NextResponse.json({ error: "No active paid subscription" }, { status: 400 });
    }

    if (!sub.polarSubscriptionId) {
      return NextResponse.json(
        {
          error:
            "Subscription is not linked to billing. Contact support to cancel.",
        },
        { status: 400 }
      );
    }

    const polar = getPolarClient();
    await polar.subscriptions.update({
      id: sub.polarSubscriptionId,
      subscriptionUpdate: {
        cancelAtPeriodEnd: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message:
        "Your subscription will cancel at the end of the current billing period. You keep access until then.",
    });
  } catch (err) {
    return apiError(err);
  }
}
