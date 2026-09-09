export type PlanId = "free" | "pro" | "researcher";

export interface PlanLimits {
  id: PlanId;
  name: string;
  priceMonthly: number;
  kbBuildsPerMonth: number;
  chatMessagesPerMonth: number;
  researchPerDay: number;
  persistentKbs: boolean;
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
};

export function getPlan(planId: string | undefined): PlanLimits {
  if (planId === "pro" || planId === "researcher") return PLANS[planId];
  return PLANS.free;
}

export function canBuildKb(plan: PlanLimits): boolean {
  return plan.kbBuildsPerMonth > 0;
}

export function canChat(plan: PlanLimits): boolean {
  return plan.chatMessagesPerMonth > 0;
}
