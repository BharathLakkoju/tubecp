import { captureException } from "@/lib/observe";
import { createNeonSql, useAppPostgres } from "@/lib/db";
import type { PlanId } from "@/lib/plans";
import {
  cancelUserSubscription,
  markSubscriptionCanceling,
  setUserPlan,
} from "@/lib/billing/subscription";

export type BillingEventType = "active" | "updated" | "canceled" | "uncanceled" | "revoked" | "past_due";

export type BillingEvent = {
  id: string;
  type: BillingEventType;
  userId: string;
  plan: PlanId;
  polarSubscriptionId: string;
  polarCustomerId?: string;
  periodStart?: string;
  periodEnd?: string;
};

const memoryEvents = new Set<string>();

function sql() {
  return createNeonSql();
}

async function claimEvent(event: BillingEvent): Promise<boolean> {
  if (useAppPostgres()) {
    const rows = (await sql().query(
      `INSERT INTO billing_events (id, type, user_id, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [event.id, event.type, event.userId, JSON.stringify(event)]
    )) as Record<string, unknown>[];
    return rows.length > 0;
  }
  if (memoryEvents.has(event.id)) return false;
  memoryEvents.add(event.id);
  return true;
}

export function resetMemoryBillingEvents(): void {
  memoryEvents.clear();
}

export async function applyBillingEvent(event: BillingEvent): Promise<"applied" | "duplicate"> {
  if (!event.userId) {
    const err = new Error("Polar billing event missing userId");
    captureException(err, { eventId: event.id, type: event.type });
    throw err;
  }

  const claimed = await claimEvent(event);
  if (!claimed) return "duplicate";

  try {
    if (event.type === "canceled") {
      await markSubscriptionCanceling(event.userId, { periodEnd: event.periodEnd });
      return "applied";
    }
    if (event.type === "revoked") {
      await cancelUserSubscription(event.userId);
      return "applied";
    }

    const status =
      event.type === "past_due" ? "past_due" : event.type === "uncanceled" || event.type === "active" || event.type === "updated"
        ? "active"
        : "active";

    await setUserPlan(event.userId, event.plan, {
      polarSubscriptionId: event.polarSubscriptionId,
      polarCustomerId: event.polarCustomerId,
      status,
      periodStart: event.periodStart,
      periodEnd: event.periodEnd,
    });
    return "applied";
  } catch (err) {
    captureException(err, { eventId: event.id, userId: event.userId, type: event.type });
    throw err;
  }
}
