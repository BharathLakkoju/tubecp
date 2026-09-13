import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@polar-sh/nextjs";
import {
  setUserPlan,
  cancelUserSubscription,
  markSubscriptionCanceling,
} from "@/lib/billing/subscription";
import type { PlanId } from "@/lib/plans";
import { planIdFromPolarProductId } from "@/lib/plans";

const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

function resolvePlanFromWebhook(data: {
  metadata?: Record<string, unknown> | null;
  productId?: string | null;
}): PlanId {
  const fromMeta = data.metadata?.plan;
  if (fromMeta === "pro" || fromMeta === "researcher" || fromMeta === "team") {
    return fromMeta;
  }
  return planIdFromPolarProductId(data.productId ?? undefined) ?? "pro";
}

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
        const plan = resolvePlanFromWebhook(data);
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
          const plan = resolvePlanFromWebhook(data);
          await setUserPlan(userId, plan, {
            polarSubscriptionId: data.id,
            status: "active",
            periodStart,
            periodEnd,
          });
          return;
        }

        if (data.status === "canceled") {
          await markSubscriptionCanceling(userId, { periodEnd });
          return;
        }

        if (data.status === "past_due") {
          const plan = resolvePlanFromWebhook(data);
          await setUserPlan(userId, plan, {
            polarSubscriptionId: data.id,
            status: "past_due",
            periodStart,
            periodEnd,
          });
        }
      },
      onSubscriptionCanceled: async (payload) => {
        const data = payload.data;
        const userId = data.metadata?.userId as string | undefined;
        if (!userId) return;
        const { periodEnd } = periodDates(data);
        await markSubscriptionCanceling(userId, { periodEnd });
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
