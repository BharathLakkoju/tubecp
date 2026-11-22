import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@polar-sh/nextjs";
import { applyBillingEvent, type BillingEventType } from "@/lib/billing/events";
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

function eventId(
  type: string,
  payload: { id?: string },
  data: { id?: string; status?: string },
  periodStart?: string
): string {
  return payload.id ?? `${type}:${data.id ?? "unknown"}:${data.status ?? type}:${periodStart ?? ""}`;
}

async function handlePolarEvent(
  type: BillingEventType,
  payload: {
    id?: string;
    data: {
      id: string;
      status?: string;
      customerId?: unknown;
      metadata?: Record<string, unknown> | null;
      productId?: string | null;
      currentPeriodStart?: Date | string | null;
      currentPeriodEnd?: Date | string | null;
    };
  }
) {
  const data = payload.data;
  const userId = typeof data.metadata?.userId === "string" ? data.metadata.userId : "";
  const { periodStart, periodEnd } = periodDates(data);
  await applyBillingEvent({
    id: eventId(type, payload, data, periodStart),
    type,
    userId,
    plan: resolvePlanFromWebhook(data),
    polarSubscriptionId: data.id,
    polarCustomerId: typeof data.customerId === "string" ? data.customerId : undefined,
    periodStart,
    periodEnd,
  });
}

const polarWebhook = webhookSecret
  ? Webhooks({
      webhookSecret,
      onSubscriptionActive: (payload) => handlePolarEvent("active", payload),
      onSubscriptionUpdated: async (payload) => {
        const status = payload.data.status;
        if (status === "canceled") {
          await handlePolarEvent("canceled", payload);
          return;
        }
        if (status === "past_due") {
          await handlePolarEvent("past_due", payload);
          return;
        }
        await handlePolarEvent("updated", payload);
      },
      onSubscriptionCanceled: (payload) => handlePolarEvent("canceled", payload),
      onSubscriptionRevoked: (payload) => handlePolarEvent("revoked", payload),
    })
  : null;

export async function POST(req: NextRequest) {
  if (!polarWebhook) {
    return NextResponse.json({ error: "Polar webhook not configured" }, { status: 503 });
  }
  return polarWebhook(req);
}
