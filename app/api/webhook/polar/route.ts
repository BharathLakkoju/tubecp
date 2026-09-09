import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@polar-sh/nextjs";
import { setUserPlan, cancelUserSubscription } from "@/lib/billing/subscription";
import type { PlanId } from "@/lib/plans";

const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

const polarWebhook = webhookSecret
  ? Webhooks({
      webhookSecret,
      onSubscriptionActive: async (payload) => {
        const data = payload.data;
        const clerkUserId = data.metadata?.clerkUserId as string | undefined;
        const plan = (data.metadata?.plan as PlanId) ?? "pro";

        if (clerkUserId) {
          await setUserPlan(clerkUserId, plan, {
            polarSubscriptionId: data.id,
            polarCustomerId: typeof data.customerId === "string" ? data.customerId : undefined,
            status: "active",
          });
        }
      },
      onSubscriptionUpdated: async (payload) => {
        const data = payload.data;
        const clerkUserId = data.metadata?.clerkUserId as string | undefined;
        if (!clerkUserId) return;

        if (data.status === "active") {
          const plan = (data.metadata?.plan as PlanId) ?? "pro";
          await setUserPlan(clerkUserId, plan, {
            polarSubscriptionId: data.id,
            status: "active",
          });
        }

        if (data.status === "canceled" || data.status === "past_due") {
          await cancelUserSubscription(clerkUserId);
        }
      },
      onSubscriptionCanceled: async (payload) => {
        const clerkUserId = payload.data.metadata?.clerkUserId as string | undefined;
        if (clerkUserId) await cancelUserSubscription(clerkUserId);
      },
      onSubscriptionRevoked: async (payload) => {
        const clerkUserId = payload.data.metadata?.clerkUserId as string | undefined;
        if (clerkUserId) await cancelUserSubscription(clerkUserId);
      },
    })
  : null;

export async function POST(req: NextRequest) {
  if (!polarWebhook) {
    return NextResponse.json({ error: "Polar webhook not configured" }, { status: 503 });
  }
  return polarWebhook(req);
}
