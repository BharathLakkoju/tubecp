/**
 * Seed credential-based test users for preview/production QA.
 *
 * Usage:
 *   ALLOW_TEST_USER_SEED=true npx tsx scripts/seed-test-users.ts
 *
 * Requires DATABASE_URL (loads .env / .env.local automatically).
 */

import { loadEnvFiles } from "../lib/load-env";
import { createDbPool } from "../lib/db";
import { hashPassword } from "../lib/password";
import { setUserPlan } from "../lib/billing/subscription";
import { PLANS, type PlanId } from "../lib/plans";

loadEnvFiles();

type SeedUser = {
  email: string;
  name: string;
  password: string;
  plan: PlanId;
  status: "active" | "canceled" | "past_due";
  polarSubscriptionId?: string;
  usage: {
    researchUsedToday: number;
    kbBuildsUsed: number;
    chatMessagesUsed: number;
  };
  notes: string;
};

const TEST_USERS: SeedUser[] = [
  {
    email: "seed-free@test.tubecp.app",
    name: "Seed Free",
    password: "Tubecp-Free-2026!",
    plan: "free",
    status: "active",
    usage: { researchUsedToday: 0, kbBuildsUsed: 0, chatMessagesUsed: 0 },
    notes: "Fresh free tier — research only, no KB/chat",
  },
  {
    email: "seed-pro@test.tubecp.app",
    name: "Seed Pro",
    password: "Tubecp-Pro-2026!",
    plan: "pro",
    status: "active",
    polarSubscriptionId: "seed_sub_pro",
    usage: { researchUsedToday: 0, kbBuildsUsed: 0, chatMessagesUsed: 0 },
    notes: "Active Pro — full paid features, fresh quotas",
  },
  {
    email: "seed-researcher@test.tubecp.app",
    name: "Seed Researcher",
    password: "Tubecp-Researcher-2026!",
    plan: "researcher",
    status: "active",
    polarSubscriptionId: "seed_sub_researcher",
    usage: { researchUsedToday: 0, kbBuildsUsed: 0, chatMessagesUsed: 0 },
    notes: "Active Researcher — highest limits",
  },
  {
    email: "seed-canceled@test.tubecp.app",
    name: "Seed Canceled",
    password: "Tubecp-Canceled-2026!",
    plan: "free",
    status: "canceled",
    polarSubscriptionId: "seed_sub_canceled",
    usage: { researchUsedToday: 0, kbBuildsUsed: 0, chatMessagesUsed: 0 },
    notes: "Canceled subscription — downgraded to free",
  },
  {
    email: "seed-quota@test.tubecp.app",
    name: "Seed Quota Exhausted",
    password: "Tubecp-Quota-2026!",
    plan: "free",
    status: "active",
    usage: {
      researchUsedToday: PLANS.free.researchPerDay,
      kbBuildsUsed: 0,
      chatMessagesUsed: 0,
    },
    notes: "Free tier with daily research limit already used",
  },
  {
    email: "seed-pro-full@test.tubecp.app",
    name: "Seed Pro Limits",
    password: "Tubecp-ProFull-2026!",
    plan: "pro",
    status: "active",
    polarSubscriptionId: "seed_sub_pro_full",
    usage: {
      researchUsedToday: 0,
      kbBuildsUsed: PLANS.pro.kbBuildsPerMonth,
      chatMessagesUsed: PLANS.pro.chatMessagesPerMonth,
    },
    notes: "Pro with KB + chat monthly limits exhausted",
  },
];

async function upsertUser(
  pool: ReturnType<typeof createDbPool>,
  name: string,
  email: string,
  password: string
): Promise<string> {
  const passwordHash = await hashPassword(password);
  const result = await pool.query<{ id: number }>(
    `INSERT INTO users (name, email, password, "emailVerified")
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT ON CONSTRAINT users_email_unique
     DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password
     RETURNING id`,
    [name, email.toLowerCase(), passwordHash]
  );

  const id = result.rows[0]?.id;
  if (!id) throw new Error(`Failed to upsert user: ${email}`);
  return String(id);
}

async function applyUsage(
  pool: ReturnType<typeof createDbPool>,
  userId: string,
  usage: SeedUser["usage"]
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await pool.query(
    `UPDATE user_subscriptions
     SET research_used_today = $2,
         kb_builds_used = $3,
         chat_messages_used = $4,
         research_day = $5::date,
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId, usage.researchUsedToday, usage.kbBuildsUsed, usage.chatMessagesUsed, today]
  );
}

async function main() {
  if (process.env.ALLOW_TEST_USER_SEED !== "true") {
    console.error("Set ALLOW_TEST_USER_SEED=true to run this script.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const pool = createDbPool();
  const results: Array<{ email: string; password: string; userId: string; notes: string }> = [];

  for (const user of TEST_USERS) {
    const userId = await upsertUser(pool, user.name, user.email, user.password);
    await setUserPlan(userId, user.plan, {
      status: user.status,
      polarSubscriptionId: user.polarSubscriptionId,
    });
    await applyUsage(pool, userId, user.usage);
    results.push({
      email: user.email,
      password: user.password,
      userId,
      notes: user.notes,
    });
  }

  await pool.end();

  console.log("\nTest users seeded successfully.\n");
  console.log("Sign in at /sign-in with email + password.\n");
  console.log("| Email | Password | User ID | Scenario |");
  console.log("|-------|----------|---------|----------|");
  for (const row of results) {
    console.log(`| ${row.email} | ${row.password} | ${row.userId} | ${row.notes} |`);
  }
  console.log("\nRemove or rotate these accounts before public launch.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
