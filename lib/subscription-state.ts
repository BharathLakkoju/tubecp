import type { PlanId } from "./plans";
import { getPlan } from "./plans";
import type { UserSubscription } from "./billing/subscription";
import type { SubscriptionState } from "./hooks/useSubscription";

export function subscriptionStateFromRecord(
  sub: UserSubscription,
  loading = false
): SubscriptionState {
  const plan = getPlan(sub.plan);

  return {
    plan: sub.plan as PlanId,
    planName: plan.name,
    kbBuildsUsed: sub.kbBuildsUsed,
    kbBuildsLimit: plan.kbBuildsPerMonth,
    chatUsed: sub.chatMessagesUsed,
    chatLimit: plan.chatMessagesPerMonth,
    researchUsedToday: sub.researchUsedToday,
    researchLimit: plan.researchPerDay,
    canBuildKb: plan.kbBuildsPerMonth > 0,
    canChat: plan.chatMessagesPerMonth > 0,
    loading,
  };
}

export const GUEST_SUBSCRIPTION_STATE: SubscriptionState = {
  plan: "free",
  planName: "Free",
  kbBuildsUsed: 0,
  kbBuildsLimit: 0,
  chatUsed: 0,
  chatLimit: 0,
  researchUsedToday: 0,
  researchLimit: 10,
  canBuildKb: false,
  canChat: false,
  loading: false,
};
