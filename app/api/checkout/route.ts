import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/auth";
import { getPolarClient, getAppUrl } from "@/lib/polar";
import type { PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
    throw err;
  }

  const planParam = (req.nextUrl.searchParams.get("plan") ?? "pro") as PlanId;
  const plan = PLANS[planParam] ?? PLANS.pro;
  const productId = plan.polarProductId;

  if (!productId) {
    return NextResponse.json(
      { error: `Polar product not configured for plan: ${plan.id}` },
      { status: 500 }
    );
  }

  try {
    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${getAppUrl()}/app?upgraded=true&plan=${plan.id}`,
      metadata: {
        clerkUserId: userId,
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
