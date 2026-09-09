import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";

export interface UserSubscription {
  userId: string;
  plan: PlanId;
  status: "active" | "canceled" | "past_due";
  polarSubscriptionId?: string;
  polarCustomerId?: string;
  periodStart: string;
  kbBuildsUsed: number;
  chatMessagesUsed: number;
  researchUsedToday: number;
  researchDay: string;
  updatedAt: string;
}

const memorySubs = new Map<string, UserSubscription>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

async function redisGet<T>(key: string): Promise<T | null> {
  const { getRedis } = await import("@/lib/store/redis");
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<T>(key)) ?? null;
}

async function redisSet(key: string, value: unknown): Promise<void> {
  const { getRedis } = await import("@/lib/store/redis");
  const redis = getRedis();
  if (redis) await redis.set(key, value);
}

function subKey(userId: string): string {
  return `user:sub:${userId}`;
}

function defaultSub(userId: string): UserSubscription {
  return {
    userId,
    plan: "free",
    status: "active",
    periodStart: monthStart(),
    kbBuildsUsed: 0,
    chatMessagesUsed: 0,
    researchUsedToday: 0,
    researchDay: todayKey(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSub(sub: UserSubscription): UserSubscription {
  const today = todayKey();
  if (sub.researchDay !== today) {
    sub.researchUsedToday = 0;
    sub.researchDay = today;
  }

  const currentMonth = monthStart();
  if (sub.periodStart !== currentMonth) {
    sub.periodStart = currentMonth;
    sub.kbBuildsUsed = 0;
    sub.chatMessagesUsed = 0;
  }

  return sub;
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const key = subKey(userId);
  let sub = (await redisGet<UserSubscription>(key)) ?? memorySubs.get(key);

  if (!sub) {
    sub = defaultSub(userId);
  } else {
    sub = normalizeSub(sub);
  }

  memorySubs.set(key, sub);
  await redisSet(key, sub);
  return sub;
}

export async function setUserPlan(
  userId: string,
  plan: PlanId,
  opts?: { polarSubscriptionId?: string; polarCustomerId?: string; status?: UserSubscription["status"] }
): Promise<UserSubscription> {
  const sub = await getUserSubscription(userId);
  sub.plan = plan;
  sub.status = opts?.status ?? "active";
  sub.periodStart = monthStart();
  sub.kbBuildsUsed = 0;
  sub.chatMessagesUsed = 0;
  if (opts?.polarSubscriptionId) sub.polarSubscriptionId = opts.polarSubscriptionId;
  if (opts?.polarCustomerId) sub.polarCustomerId = opts.polarCustomerId;
  sub.updatedAt = new Date().toISOString();

  const key = subKey(userId);
  memorySubs.set(key, sub);
  await redisSet(key, sub);
  return sub;
}

export async function cancelUserSubscription(userId: string): Promise<UserSubscription> {
  return setUserPlan(userId, "free", { status: "canceled" });
}

export type UsageType = "research" | "kb_build" | "chat";

export class UsageLimitError extends Error {
  code = "USAGE_LIMIT";
  constructor(message: string) {
    super(message);
    this.name = "UsageLimitError";
  }
}

export class FeatureGateError extends Error {
  code = "FEATURE_GATE";
  constructor(message: string) {
    super(message);
    this.name = "FeatureGateError";
  }
}

export async function checkAndIncrementUsage(
  userId: string,
  type: UsageType
): Promise<UserSubscription> {
  const sub = await getUserSubscription(userId);
  const plan = getPlan(sub.plan);

  if (sub.status !== "active" && sub.plan !== "free") {
    throw new FeatureGateError("Your subscription is not active. Please update billing.");
  }

  if (type === "research") {
    if (sub.researchUsedToday >= plan.researchPerDay) {
      throw new UsageLimitError(
        `Daily research limit reached (${plan.researchPerDay}/day). Upgrade for more.`
      );
    }
    sub.researchUsedToday += 1;
  }

  if (type === "kb_build") {
    if (!plan.kbBuildsPerMonth) {
      throw new FeatureGateError("Knowledge base builds require a Pro plan. Upgrade to unlock.");
    }
    if (sub.kbBuildsUsed >= plan.kbBuildsPerMonth) {
      throw new UsageLimitError(
        `Monthly KB build limit reached (${plan.kbBuildsPerMonth}/mo). Upgrade or wait until next month.`
      );
    }
    sub.kbBuildsUsed += 1;
  }

  if (type === "chat") {
    if (!plan.chatMessagesPerMonth) {
      throw new FeatureGateError("Chat requires a Pro plan. Upgrade to unlock.");
    }
    if (sub.chatMessagesUsed >= plan.chatMessagesPerMonth) {
      throw new UsageLimitError(
        `Monthly chat limit reached (${plan.chatMessagesPerMonth}/mo). Upgrade or wait until next month.`
      );
    }
    sub.chatMessagesUsed += 1;
  }

  sub.updatedAt = new Date().toISOString();
  const key = subKey(userId);
  memorySubs.set(key, sub);
  await redisSet(key, sub);
  return sub;
}

export async function resetMonthlyUsageIfNeeded(userId: string): Promise<void> {
  const sub = await getUserSubscription(userId);
  const currentMonth = monthStart();
  if (sub.periodStart !== currentMonth) {
    sub.periodStart = currentMonth;
    sub.kbBuildsUsed = 0;
    sub.chatMessagesUsed = 0;
    sub.updatedAt = new Date().toISOString();
    const key = subKey(userId);
    memorySubs.set(key, sub);
    await redisSet(key, sub);
  }
}
