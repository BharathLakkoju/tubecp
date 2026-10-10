import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { getUserSubscription } from "@/lib/billing/subscription";
import { isE2eAuthBypass } from "@/lib/e2e";
import { toKnowledgeBaseSummary } from "@/lib/knowledge-bases";
import type { SubscriptionState } from "@/lib/hooks/useSubscription";
import type { KnowledgeBase } from "@/lib/types";
import { toSavedResearchSummary } from "@/lib/researches";
import { listUserKnowledgeBaseRecords, listUserSavedResearchRecords } from "@/lib/store";
import type { SavedResearch } from "@/lib/types";
import {
  GUEST_SUBSCRIPTION_STATE,
  subscriptionStateFromRecord,
} from "@/lib/subscription-state";

export interface ProductBootstrap {
  session: Session | null;
  subscription: SubscriptionState;
  knowledgeBases: KnowledgeBase[];
  researches: SavedResearch[];
}

const getCachedUserSubscription = unstable_cache(
  async (userId: string) => getUserSubscription(userId),
  ["product-user-subscription"],
  { revalidate: 30 }
);

const getCachedUserKnowledgeBases = unstable_cache(
  async (userId: string) => listUserKnowledgeBaseRecords(userId),
  ["product-user-knowledge-bases"],
  { revalidate: 30 }
);

const getCachedUserResearches = unstable_cache(
  async (userId: string) => listUserSavedResearchRecords(userId),
  ["product-user-researches"],
  { revalidate: 30 }
);

export const getProductBootstrap = cache(async function getProductBootstrap(): Promise<ProductBootstrap> {
  if (isE2eAuthBypass()) {
    return {
      session: null,
      subscription: GUEST_SUBSCRIPTION_STATE,
      knowledgeBases: [],
      researches: [],
    };
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      session,
      subscription: GUEST_SUBSCRIPTION_STATE,
      knowledgeBases: [],
      researches: [],
    };
  }

  const [sub, records, researchRecords] = await Promise.all([
    getCachedUserSubscription(userId),
    getCachedUserKnowledgeBases(userId),
    getCachedUserResearches(userId),
  ]);

  const researches = researchRecords
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toSavedResearchSummary);

  return {
    session,
    subscription: subscriptionStateFromRecord(sub),
    knowledgeBases: records.map(toKnowledgeBaseSummary),
    researches,
  };
});
