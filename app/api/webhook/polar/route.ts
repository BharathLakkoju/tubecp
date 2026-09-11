import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@polar-sh/nextjs";
import { setUserPlan, cancelUserSubscription } from "@/lib/billing/subscription";
import type { PlanId } from "@/lib/plans";

const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

function periodDates(data: {
  currentPeriodStart?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
}) {
  const periodStart = data.currentPeriodStart
    ? new Date(data.currentPeriodStart).toISOString()
    : undefined;
  const periodEnd = data.currentPeriodEnd
    ? new Date(data.currentPeriodEnd).toISOString()
    : undefined;
  return { periodStart, periodEnd };
}

const polarWebhook = webhookSecret
  ? Webhooks({
      webhookSecret,
      onSubscriptionActive: async (payload) => {
        const data = payload.data;
        const userId = data.metadata?.userId as string | undefined;
        const plan = (data.metadata?.plan as PlanId) ?? "pro";
        const { periodStart, periodEnd } = periodDates(data);

        if (userId) {
          await setUserPlan(userId, plan, {
            polarSubscriptionId: data.id,
            polarCustomerId: typeof data.customerId === "string" ? data.customerId : undefined,
            status: "active",
            periodStart,
            periodEnd,
          });
        }
      },
      onSubscriptionUpdated: async (payload) => {
        const data = payload.data;
        const userId = data.metadata?.userId as string | undefined;
        if (!userId) return;

        const { periodStart, periodEnd } = periodDates(data);

        if (data.status === "active") {
          const plan = (data.metadata?.plan as PlanId) ?? "pro";
          await setUserPlan(userId, plan, {
            polarSubscriptionId: data.id,
            status: "active",
            periodStart,
            periodEnd,
          });
        }

        if (data.status === "canceled" || data.status === "past_due") {
          await cancelUserSubscription(userId);
        }
      },
      onSubscriptionCanceled: async (payload) => {
        const userId = payload.data.metadata?.userId as string | undefined;
        if (userId) await cancelUserSubscription(userId);
      },
      onSubscriptionRevoked: async (payload) => {
        const userId = payload.data.metadata?.userId as string | undefined;
        if (userId) await cancelUserSubscription(userId);
      },
    })
  : null;

export async function POST(req: NextRequest) {
  if (!polarWebhook) {
    return NextResponse.json({ error: "Polar webhook not configured" }, { status: 503 });
  }
  return polarWebhook(req);
}
