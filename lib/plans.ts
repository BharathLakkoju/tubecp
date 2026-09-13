export type PlanId = "free" | "pro" | "researcher" | "team";

export interface PlanLimits {
  id: PlanId;
  name: string;
  priceMonthly: number;
  kbBuildsPerMonth: number;
  chatMessagesPerMonth: number;
  researchPerDay: number;
  persistentKbs: boolean;
  seatLimit?: number;
  polarProductId?: string;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    kbBuildsPerMonth: 0,
    chatMessagesPerMonth: 0,
    researchPerDay: 10,
    persistentKbs: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 9,
    kbBuildsPerMonth: 10,
    chatMessagesPerMonth: 200,
    researchPerDay: 50,
    persistentKbs: true,
    polarProductId: process.env.POLAR_PRODUCT_ID_PRO,
  },
  researcher: {
    id: "researcher",
    name: "Researcher",
    priceMonthly: 19,
    kbBuildsPerMonth: 30,
    chatMessagesPerMonth: 600,
    researchPerDay: 100,
    persistentKbs: true,
    polarProductId: process.env.POLAR_PRODUCT_ID_RESEARCHER,
  },
  team: {
    id: "team",
    name: "Team",
    priceMonthly: 49,
    kbBuildsPerMonth: 50,
    chatMessagesPerMonth: 2000,
    researchPerDay: 200,
    persistentKbs: true,
    seatLimit: 5,
    polarProductId: process.env.POLAR_PRODUCT_ID_TEAM,
  },
};

export function getPlan(planId: string | undefined): PlanLimits {
  if (planId === "pro" || planId === "researcher" || planId === "team") {
    return PLANS[planId];
  }
  return PLANS.free;
}

export function canBuildKb(plan: PlanLimits): boolean {
  return plan.kbBuildsPerMonth > 0;
}

export function canChat(plan: PlanLimits): boolean {
  return plan.chatMessagesPerMonth > 0;
}

export function isPaidPlanConfigured(plan: PlanLimits): boolean {
  return plan.id === "free" || Boolean(plan.polarProductId?.trim());
}

/** Plans shown on marketing/pricing surfaces (hides paid tiers without Polar product IDs). */
export function getPricingPlans(): PlanLimits[] {
  return [PLANS.free, PLANS.pro, PLANS.researcher].filter(isPaidPlanConfigured);
}

export function getPolarProductStatus(): Record<"pro" | "researcher" | "team", boolean> {
  return {
    pro: Boolean(PLANS.pro.polarProductId?.trim()),
    researcher: Boolean(PLANS.researcher.polarProductId?.trim()),
    team: Boolean(PLANS.team.polarProductId?.trim()),
  };
}
