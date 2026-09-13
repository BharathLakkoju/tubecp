import type { PlanId } from "@/lib/plans";

const PLAN_TIER: Record<PlanId, number> = {
  free: 0,
  pro: 1,
  researcher: 2,
  team: 3,
};

export type PricingPlanAction =
  | "current"
  | "signup"
  | "checkout"
  | "upgrade"
  | "downgrade_at_period_end"
  | "cancel_via_account";

export function getPlanTier(planId: PlanId): number {
  return PLAN_TIER[planId];
}

export function comparePlanTiers(current: PlanId, target: PlanId): number {
  return getPlanTier(target) - getPlanTier(current);
}

export function getPricingPlanAction(opts: {
  isLoggedIn: boolean;
  currentPlanId: PlanId;
  targetPlanId: PlanId;
  hasPolarSubscription: boolean;
}): PricingPlanAction {
  const { isLoggedIn, currentPlanId, targetPlanId, hasPolarSubscription } = opts;

  if (!isLoggedIn) {
    return targetPlanId === "free" ? "signup" : "checkout";
  }

  if (currentPlanId === targetPlanId) {
    return "current";
  }

  if (targetPlanId === "free") {
    return currentPlanId === "free" ? "current" : "cancel_via_account";
  }

  const delta = comparePlanTiers(currentPlanId, targetPlanId);

  if (delta > 0) {
    return currentPlanId === "free" || !hasPolarSubscription ? "checkout" : "upgrade";
  }

  if (delta < 0) {
    return "downgrade_at_period_end";
  }

  return "current";
}

export function isPaidPlanId(planId: string): planId is Exclude<PlanId, "free"> {
  return planId === "pro" || planId === "researcher" || planId === "team";
}
