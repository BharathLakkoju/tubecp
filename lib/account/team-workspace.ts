import { getUserSubscription, isSubscriptionUsable } from "@/lib/billing/subscription";
import { isTeamPlanPublic } from "@/lib/plans";

/** Show team workspace UI when the tier is public or the user has an active Team subscription. */
export async function shouldShowTeamWorkspace(userId: string | undefined): Promise<boolean> {
  if (!userId) {
    return false;
  }

  if (isTeamPlanPublic()) {
    return true;
  }

  const sub = await getUserSubscription(userId);
  return sub.plan === "team" && isSubscriptionUsable(sub);
}
