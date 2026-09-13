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

const PLAN_ORDER: PlanId[] = ["free", "pro", "researcher", "team"];

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
  },
  researcher: {
    id: "researcher",
    name: "Researcher",
    priceMonthly: 19,
    kbBuildsPerMonth: 30,
    chatMessagesPerMonth: 600,
    researchPerDay: 100,
    persistentKbs: true,
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
  },
};

/** Read Polar product IDs at call time so Vercel runtime env vars apply. */
export function resolvePolarProductId(planId: PlanId): string | undefined {
  switch (planId) {
    case "pro":
      return process.env.POLAR_PRODUCT_ID_PRO?.trim() || undefined;
    case "researcher":
      return process.env.POLAR_PRODUCT_ID_RESEARCHER?.trim() || undefined;
    case "team":
      return process.env.POLAR_PRODUCT_ID_TEAM?.trim() || undefined;
    default:
      return undefined;
  }
}

/** Map a Polar product ID back to a plan (for webhooks after product changes). */
export function planIdFromPolarProductId(productId: string | undefined): PlanId | undefined {
  if (!productId?.trim()) return undefined;
  const id = productId.trim();
  if (id === resolvePolarProductId("pro")) return "pro";
  if (id === resolvePolarProductId("researcher")) return "researcher";
  if (id === resolvePolarProductId("team")) return "team";
  return undefined;
}

export function getPlan(planId: string | undefined): PlanLimits {
  if (planId === "pro" || planId === "researcher" || planId === "team") {
    return {
      ...PLANS[planId],
      polarProductId: resolvePolarProductId(planId),
    };
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
  return PLAN_ORDER.map((id) => getPlan(id)).filter(isPaidPlanConfigured);
}

export function getPolarProductStatus(): Record<"pro" | "researcher" | "team", boolean> {
  return {
    pro: Boolean(resolvePolarProductId("pro")),
    researcher: Boolean(resolvePolarProductId("researcher")),
    team: Boolean(resolvePolarProductId("team")),
  };
}
