import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";
import { createDbPool } from "@/lib/db";
import { isE2eAuthBypass } from "@/lib/e2e";

export interface UserSubscription {
  userId: string;
  plan: PlanId;
  status: "active" | "canceled" | "past_due";
  polarSubscriptionId?: string;
  polarCustomerId?: string;
  periodStart: string;
  periodEnd?: string;
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

function monthEnd(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
}

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL) && !isE2eAuthBypass();
}

type SubscriptionRow = {
  user_id: number | string;
  plan: string;
  status: string;
  polar_subscription_id: string | null;
  polar_customer_id: string | null;
  period_start: Date;
  period_end: Date | null;
  kb_builds_used: number;
  chat_messages_used: number;
  research_used_today: number;
  research_day: string;
  updated_at: Date;
};

function rowToSubscription(row: SubscriptionRow): UserSubscription {
  return {
    userId: String(row.user_id),
    plan: row.plan as PlanId,
    status: row.status as UserSubscription["status"],
    polarSubscriptionId: row.polar_subscription_id ?? undefined,
    polarCustomerId: row.polar_customer_id ?? undefined,
    periodStart: row.period_start.toISOString(),
    periodEnd: row.period_end?.toISOString(),
    kbBuildsUsed: row.kb_builds_used,
    chatMessagesUsed: row.chat_messages_used,
    researchUsedToday: row.research_used_today,
    researchDay: row.research_day,
    updatedAt: row.updated_at.toISOString(),
  };
}

function defaultSub(userId: string): UserSubscription {
  return {
    userId,
    plan: "free",
    status: "active",
    periodStart: monthStart(),
    periodEnd: monthEnd(),
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
  if (sub.periodStart !== currentMonth && sub.plan === "free") {
    sub.periodStart = currentMonth;
    sub.periodEnd = monthEnd();
    sub.kbBuildsUsed = 0;
    sub.chatMessagesUsed = 0;
  }

  return sub;
}

async function readSubscriptionFromDb(userId: string): Promise<UserSubscription | null> {
  const pool = createDbPool();
  const result = await pool.query<SubscriptionRow>(
    `SELECT user_id, plan, status, polar_subscription_id, polar_customer_id,
            period_start, period_end, kb_builds_used, chat_messages_used,
            research_used_today, research_day::text, updated_at
     FROM user_subscriptions
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ? rowToSubscription(result.rows[0]) : null;
}

async function writeSubscriptionToDb(sub: UserSubscription): Promise<void> {
  const pool = createDbPool();
  await pool.query(
    `INSERT INTO user_subscriptions (
       user_id, plan, status, polar_subscription_id, polar_customer_id,
       period_start, period_end, kb_builds_used, chat_messages_used,
       research_used_today, research_day, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12)
     ON CONFLICT (user_id) DO UPDATE SET
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       polar_subscription_id = EXCLUDED.polar_subscription_id,
       polar_customer_id = EXCLUDED.polar_customer_id,
       period_start = EXCLUDED.period_start,
       period_end = EXCLUDED.period_end,
       kb_builds_used = EXCLUDED.kb_builds_used,
       chat_messages_used = EXCLUDED.chat_messages_used,
       research_used_today = EXCLUDED.research_used_today,
       research_day = EXCLUDED.research_day,
       updated_at = EXCLUDED.updated_at`,
    [
      sub.userId,
      sub.plan,
      sub.status,
      sub.polarSubscriptionId ?? null,
      sub.polarCustomerId ?? null,
      sub.periodStart,
      sub.periodEnd ?? null,
      sub.kbBuildsUsed,
      sub.chatMessagesUsed,
      sub.researchUsedToday,
      sub.researchDay,
      sub.updatedAt,
    ]
  );
}

export async function ensureUserSubscription(userId: string): Promise<UserSubscription> {
  if (usePostgres()) {
    const existing = await readSubscriptionFromDb(userId);
    if (existing) return normalizeSub(existing);

    const sub = defaultSub(userId);
    await writeSubscriptionToDb(sub);
    return sub;
  }

  const key = userId;
  if (!memorySubs.has(key)) {
    memorySubs.set(key, defaultSub(userId));
  }
  return memorySubs.get(key)!;
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  if (usePostgres()) {
    let sub = await readSubscriptionFromDb(userId);
    if (!sub) {
      sub = await ensureUserSubscription(userId);
    } else {
      sub = normalizeSub(sub);
      await writeSubscriptionToDb(sub);
    }
    return sub;
  }

  let sub = memorySubs.get(userId);
  if (!sub) {
    sub = defaultSub(userId);
  } else {
    sub = normalizeSub(sub);
  }
  memorySubs.set(userId, sub);
  return sub;
}

export async function setUserPlan(
  userId: string,
  plan: PlanId,
  opts?: {
    polarSubscriptionId?: string;
    polarCustomerId?: string;
    status?: UserSubscription["status"];
    periodStart?: string;
    periodEnd?: string;
  }
): Promise<UserSubscription> {
  const sub = await getUserSubscription(userId);
  sub.plan = plan;
  sub.status = opts?.status ?? "active";
  sub.periodStart = opts?.periodStart ?? monthStart();
  sub.periodEnd = opts?.periodEnd ?? (plan === "free" ? monthEnd() : sub.periodEnd);
  sub.kbBuildsUsed = 0;
  sub.chatMessagesUsed = 0;
  if (opts?.polarSubscriptionId) sub.polarSubscriptionId = opts.polarSubscriptionId;
  if (opts?.polarCustomerId) sub.polarCustomerId = opts.polarCustomerId;
  sub.updatedAt = new Date().toISOString();

  if (usePostgres()) {
    await writeSubscriptionToDb(sub);
  } else {
    memorySubs.set(userId, sub);
  }
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

function usageLimitsBypassed(): boolean {
  return process.env.DEV_BYPASS_USAGE_LIMITS === "true";
}

async function persistSubscription(sub: UserSubscription): Promise<void> {
  if (usePostgres()) {
    await writeSubscriptionToDb(sub);
  } else {
    memorySubs.set(sub.userId, sub);
  }
}

function assertUsageWithinLimit(sub: UserSubscription, type: UsageType): void {
  if (usageLimitsBypassed()) {
    return;
  }

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
    return;
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
    return;
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
  }
}

/** Check quota without consuming it (e.g. at the start of a multi-step flow). */
export async function assertUsageAvailable(
  userId: string,
  type: UsageType
): Promise<UserSubscription> {
  const sub = await getUserSubscription(userId);
  assertUsageWithinLimit(sub, type);
  return sub;
}

export async function checkAndIncrementUsage(
  userId: string,
  type: UsageType
): Promise<UserSubscription> {
  const sub = await getUserSubscription(userId);
  assertUsageWithinLimit(sub, type);

  if (usageLimitsBypassed()) {
    return sub;
  }

  if (type === "research") {
    sub.researchUsedToday += 1;
  }

  if (type === "kb_build") {
    sub.kbBuildsUsed += 1;
  }

  if (type === "chat") {
    sub.chatMessagesUsed += 1;
  }

  sub.updatedAt = new Date().toISOString();
  await persistSubscription(sub);
  return sub;
}

export async function resetMonthlyUsageIfNeeded(userId: string): Promise<void> {
  const sub = await getUserSubscription(userId);
  const currentMonth = monthStart();
  if (sub.periodStart !== currentMonth && sub.plan === "free") {
    sub.periodStart = currentMonth;
    sub.periodEnd = monthEnd();
    sub.kbBuildsUsed = 0;
    sub.chatMessagesUsed = 0;
    sub.updatedAt = new Date().toISOString();
    await persistSubscription(sub);
  }
}
