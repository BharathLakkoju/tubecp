import { describe, expect, it } from "vitest";
import {
  comparePlanTiers,
  getPlanTier,
  getPricingPlanAction,
} from "@/lib/billing/plan-changes";

describe("plan-changes", () => {
  it("orders plan tiers", () => {
    expect(getPlanTier("free")).toBeLessThan(getPlanTier("pro"));
    expect(getPlanTier("pro")).toBeLessThan(getPlanTier("researcher"));
    expect(getPlanTier("researcher")).toBeLessThan(getPlanTier("team"));
  });

  it("compares plan tiers", () => {
    expect(comparePlanTiers("pro", "researcher")).toBeGreaterThan(0);
    expect(comparePlanTiers("researcher", "pro")).toBeLessThan(0);
    expect(comparePlanTiers("pro", "pro")).toBe(0);
  });

  it("marks current plan for signed-in users", () => {
    expect(
      getPricingPlanAction({
        isLoggedIn: true,
        currentPlanId: "researcher",
        targetPlanId: "researcher",
        hasPolarSubscription: true,
      })
    ).toBe("current");
  });

  it("allows pro to upgrade to researcher or team", () => {
    expect(
      getPricingPlanAction({
        isLoggedIn: true,
        currentPlanId: "pro",
        targetPlanId: "researcher",
        hasPolarSubscription: true,
      })
    ).toBe("upgrade");

    expect(
      getPricingPlanAction({
        isLoggedIn: true,
        currentPlanId: "pro",
        targetPlanId: "team",
        hasPolarSubscription: true,
      })
    ).toBe("upgrade");
  });

  it("allows researcher to upgrade to team only among upgrades", () => {
    expect(
      getPricingPlanAction({
        isLoggedIn: true,
        currentPlanId: "researcher",
        targetPlanId: "team",
        hasPolarSubscription: true,
      })
    ).toBe("upgrade");
  });

  it("schedules researcher to pro at period end", () => {
    expect(
      getPricingPlanAction({
        isLoggedIn: true,
        currentPlanId: "researcher",
        targetPlanId: "pro",
        hasPolarSubscription: true,
      })
    ).toBe("downgrade_at_period_end");
  });

  it("routes paid users to account billing to reach free", () => {
    expect(
      getPricingPlanAction({
        isLoggedIn: true,
        currentPlanId: "researcher",
        targetPlanId: "free",
        hasPolarSubscription: true,
      })
    ).toBe("cancel_via_account");
  });

  it("uses checkout for free users upgrading", () => {
    expect(
      getPricingPlanAction({
        isLoggedIn: true,
        currentPlanId: "free",
        targetPlanId: "pro",
        hasPolarSubscription: false,
      })
    ).toBe("checkout");
  });
});
