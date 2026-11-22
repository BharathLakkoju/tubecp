import { describe, expect, it, beforeEach } from "vitest";
import { applyBillingEvent, resetMemoryBillingEvents } from "@/lib/billing/events";
import { checkAndIncrementUsage, getUserSubscription, setUserPlan } from "@/lib/billing/subscription";

function uid(name: string) {
  return `test_billing_${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

describe("applyBillingEvent", () => {
  beforeEach(() => {
    resetMemoryBillingEvents();
  });

  it("throws when userId is missing", async () => {
    await expect(
      applyBillingEvent({
        id: "evt-missing",
        type: "active",
        userId: "",
        plan: "pro",
        polarSubscriptionId: "sub_1",
      })
    ).rejects.toThrow(/userId/);
  });

  it("ignores duplicate event ids", async () => {
    const userId = uid("dup");
    const event = {
      id: "evt-dup",
      type: "active" as const,
      userId,
      plan: "pro" as const,
      polarSubscriptionId: "sub_1",
      periodStart: new Date().toISOString(),
    };
    expect(await applyBillingEvent(event)).toBe("applied");
    expect(await applyBillingEvent(event)).toBe("duplicate");
  });

  it("does not reset usage on same-period webhook replay with a new event id", async () => {
    const userId = uid("replay");
    const periodStart = new Date(Date.UTC(2026, 0, 1)).toISOString();
    await setUserPlan(userId, "pro", { periodStart });
    await checkAndIncrementUsage(userId, "kb_build");
    expect((await getUserSubscription(userId)).kbBuildsUsed).toBe(1);

    await applyBillingEvent({
      id: "evt-replay-1",
      type: "updated",
      userId,
      plan: "pro",
      polarSubscriptionId: "sub_1",
      periodStart,
    });
    expect((await getUserSubscription(userId)).kbBuildsUsed).toBe(1);
  });

  it("resets usage when the billing period rolls over", async () => {
    const userId = uid("rollover");
    const oldPeriod = new Date(Date.UTC(2025, 11, 1)).toISOString();
    const newPeriod = new Date(Date.UTC(2026, 0, 1)).toISOString();
    await setUserPlan(userId, "pro", { periodStart: oldPeriod });
    await checkAndIncrementUsage(userId, "kb_build");

    await applyBillingEvent({
      id: "evt-roll",
      type: "updated",
      userId,
      plan: "pro",
      polarSubscriptionId: "sub_1",
      periodStart: newPeriod,
    });
    expect((await getUserSubscription(userId)).kbBuildsUsed).toBe(0);
  });
});
