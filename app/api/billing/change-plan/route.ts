import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import {
  getPricingPlanAction,
  isPaidPlanId,
} from "@/lib/billing/plan-changes";
import { checkoutPathForPlan } from "@/lib/billing/checkout-flow";
import { changePolarSubscriptionProduct } from "@/lib/billing/polar-subscription";
import { getUserSubscription, setUserPlan } from "@/lib/billing/subscription";
import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { plan?: string };
    const targetPlanId = body.plan as PlanId | undefined;

    if (!targetPlanId || !isPaidPlanId(targetPlanId)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const sub = await getUserSubscription(userId);
    const action = getPricingPlanAction({
      isLoggedIn: true,
      currentPlanId: sub.plan,
      targetPlanId,
      hasPolarSubscription: Boolean(sub.polarSubscriptionId),
    });

    if (action === "current") {
      return NextResponse.json({ error: "You are already on this plan" }, { status: 400 });
    }

    if (action === "cancel_via_account") {
      return NextResponse.json(
        {
          error: "Cancel your subscription from Billing & plans in your account settings.",
          code: "CANCEL_VIA_ACCOUNT",
        },
        { status: 400 }
      );
    }

    if (action === "checkout") {
      return NextResponse.json({
        redirect: checkoutPathForPlan(targetPlanId),
      });
    }

    const targetPlan = getPlan(targetPlanId);
    const productId = targetPlan.polarProductId;

    if (!productId) {
      return NextResponse.json(
        { error: `Polar product not configured for plan: ${targetPlanId}` },
        { status: 500 }
      );
    }

    if (!sub.polarSubscriptionId) {
      return NextResponse.json({
        redirect: checkoutPathForPlan(targetPlanId),
      });
    }

    const polarResult = await changePolarSubscriptionProduct(
      sub.polarSubscriptionId,
      productId,
      action === "upgrade" ? "upgrade" : "downgrade_at_period_end"
    );

    if (action === "upgrade") {
      await setUserPlan(userId, targetPlanId, {
        polarSubscriptionId: sub.polarSubscriptionId,
        polarCustomerId: sub.polarCustomerId,
        status: sub.status === "canceled" ? "active" : sub.status,
        periodStart: sub.periodStart,
        periodEnd: sub.periodEnd,
      });

      return NextResponse.json({
        ok: true,
        plan: targetPlanId,
        message: `Your plan is now ${targetPlan.name}. New limits apply immediately.`,
      });
    }

    const appliesAt = polarResult?.pendingSubscriptionUpdate?.appliesAt?.toISOString();

    return NextResponse.json({
      ok: true,
      scheduled: true,
      plan: targetPlanId,
      appliesAt,
      message: appliesAt
        ? `Your plan will change to ${targetPlan.name} on ${new Date(appliesAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}. You keep ${getPlan(sub.plan).name} until then.`
        : `Your plan will change to ${targetPlan.name} at the end of your current billing period.`,
    });
  } catch (err) {
    return apiError(err);
  }
}
