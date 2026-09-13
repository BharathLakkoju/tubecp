import { describe, expect, it } from "vitest";
import {
  assertUsageAvailable,
  checkAndIncrementUsage,
  FeatureGateError,
  getUserSubscription,
  isSubscriptionUsable,
  markSubscriptionCanceling,
  setUserPlan,
  UsageLimitError,
} from "@/lib/billing/subscription";

function uid(name: string) {
  return `test_user_${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

describe("subscription usage", () => {
  it("allows free tier research within daily limit", async () => {
    const userId = uid("research");
    const sub = await checkAndIncrementUsage(userId, "research");
    expect(sub.researchUsedToday).toBe(1);
    expect(sub.plan).toBe("free");
  });

  it("assertUsageAvailable checks quota without consuming it", async () => {
    const userId = uid("research_peek");
    await assertUsageAvailable(userId, "research");
    const sub = await getUserSubscription(userId);
    expect(sub.researchUsedToday).toBe(0);

    await checkAndIncrementUsage(userId, "research");
    const charged = await getUserSubscription(userId);
    expect(charged.researchUsedToday).toBe(1);
  });

  it("blocks KB build on free tier", async () => {
    const userId = uid("kb_free");
    await expect(checkAndIncrementUsage(userId, "kb_build")).rejects.toBeInstanceOf(
      FeatureGateError
    );
  });

  it("allows KB build on pro tier", async () => {
    const userId = uid("kb_pro");
    await setUserPlan(userId, "pro");
    const sub = await checkAndIncrementUsage(userId, "kb_build");
    expect(sub.kbBuildsUsed).toBe(1);
    expect(sub.plan).toBe("pro");
  });

  it("blocks chat on free tier", async () => {
    const userId = uid("chat_free");
    await expect(checkAndIncrementUsage(userId, "chat")).rejects.toBeInstanceOf(
      FeatureGateError
    );
  });

  it("enforces pro KB monthly limit", async () => {
    const userId = uid("kb_limit");
    await setUserPlan(userId, "pro");

    for (let i = 0; i < 10; i++) {
      await checkAndIncrementUsage(userId, "kb_build");
    }

    await expect(checkAndIncrementUsage(userId, "kb_build")).rejects.toBeInstanceOf(
      UsageLimitError
    );
  });

  it("downgrades canceled users via setUserPlan", async () => {
    const userId = uid("cancel");
    await setUserPlan(userId, "pro", { polarSubscriptionId: "sub_123" });
    const sub = await setUserPlan(userId, "free", { status: "canceled" });
    expect(sub.plan).toBe("free");
    expect(sub.status).toBe("canceled");
  });

  it("keeps paid access until period end when canceling", async () => {
    const userId = uid("cancel_period");
    const periodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await setUserPlan(userId, "pro", { periodEnd });

    const canceled = await markSubscriptionCanceling(userId, { periodEnd });
    expect(canceled.status).toBe("canceled");
    expect(canceled.plan).toBe("pro");
    expect(isSubscriptionUsable(canceled)).toBe(true);

    await expect(checkAndIncrementUsage(userId, "kb_build")).resolves.toBeDefined();
  });
});
