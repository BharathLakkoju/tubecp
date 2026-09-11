import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/auth";
import { checkoutPathForPlan, isPaidPlan } from "@/lib/billing/checkout-flow";
import { getPolarClient, getAppUrl } from "@/lib/polar";
import type { PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const planParam = (req.nextUrl.searchParams.get("plan") ?? "pro") as PlanId;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof AuthError) {
      const checkoutPlan = isPaidPlan(planParam) ? planParam : "pro";
      const callbackUrl = encodeURIComponent(checkoutPathForPlan(checkoutPlan));
      return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${callbackUrl}`, req.url));
    }
    throw err;
  }

  const plan = PLANS[planParam] ?? PLANS.pro;
  const productId = plan.polarProductId;

  if (!productId) {
    return NextResponse.json(
      { error: `Polar product not configured for plan: ${plan.id}` },
      { status: 500 }
    );
  }

  const appUrl = getAppUrl();

  try {
    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${appUrl}/app?upgraded=true&plan=${plan.id}`,
      returnUrl: `${appUrl}/pricing?checkout=canceled`,
      metadata: {
        userId,
        plan: plan.id,
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.redirect(checkout.url);
  } catch (err) {
    console.error("Polar checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
