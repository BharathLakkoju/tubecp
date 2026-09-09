"use client";

import { useSubscriptionContext } from "@/components/AuthShell";

export interface SubscriptionState {
  plan: import("@/lib/plans").PlanId;
  planName: string;
  kbBuildsUsed: number;
  kbBuildsLimit: number;
  chatUsed: number;
  chatLimit: number;
  researchUsedToday: number;
  researchLimit: number;
  canBuildKb: boolean;
  canChat: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionState {
  return useSubscriptionContext();
}
