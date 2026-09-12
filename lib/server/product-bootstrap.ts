import { auth } from "@/auth";
import { getUserSubscription } from "@/lib/billing/subscription";
import { isE2eAuthBypass } from "@/lib/e2e";
import { toKnowledgeBaseSummary } from "@/lib/knowledge-bases";
import type { SubscriptionState } from "@/lib/hooks/useSubscription";
import type { KnowledgeBase } from "@/lib/types";
import { listUserKnowledgeBaseRecords } from "@/lib/store";
import {
  GUEST_SUBSCRIPTION_STATE,
  subscriptionStateFromRecord,
} from "@/lib/subscription-state";

export interface ProductBootstrap {
  subscription: SubscriptionState;
  knowledgeBases: KnowledgeBase[];
}

export async function getProductBootstrap(): Promise<ProductBootstrap> {
  if (isE2eAuthBypass()) {
    return {
      subscription: GUEST_SUBSCRIPTION_STATE,
      knowledgeBases: [],
    };
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      subscription: GUEST_SUBSCRIPTION_STATE,
      knowledgeBases: [],
    };
  }

  const [sub, records] = await Promise.all([
    getUserSubscription(userId),
    listUserKnowledgeBaseRecords(userId),
  ]);

  return {
    subscription: subscriptionStateFromRecord(sub),
    knowledgeBases: records.map(toKnowledgeBaseSummary),
  };
}
