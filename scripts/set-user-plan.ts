/**
 * Set a user's subscription plan (local/dev admin helper).
 *
 * Usage:
 *   npx tsx scripts/set-user-plan.ts <user-id> <free|pro|researcher>
 *
 * Find your user ID on the account page or from GET /api/user/subscription
 * while signed in (subscription.userId in the JSON response).
 */

import type { PlanId } from "../lib/plans";
import { setUserPlan } from "../lib/billing/subscription";

const userId = process.argv[2];
const plan = process.argv[3] as PlanId | undefined;

const validPlans: PlanId[] = ["free", "pro", "researcher"];

if (!userId || !plan || !validPlans.includes(plan)) {
  console.error("Usage: npx tsx scripts/set-user-plan.ts <user-id> <free|pro|researcher>");
  process.exit(1);
}

setUserPlan(userId, plan)
  .then((sub) => {
    console.log(`Set plan for ${userId} → ${sub.plan} (${sub.status})`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
