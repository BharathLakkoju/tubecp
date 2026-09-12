"use client";

import type { ReactNode } from "react";
import type { KnowledgeBase } from "@/lib/types";
import type { SubscriptionState } from "@/lib/hooks/useSubscription";
import { SubscriptionContext } from "@/components/AuthShell";
import { KnowledgeBasesProvider } from "@/lib/contexts/KnowledgeBasesContext";

export default function ProductBootstrap({
  subscription,
  knowledgeBases,
  children,
}: {
  subscription: SubscriptionState;
  knowledgeBases: KnowledgeBase[];
  children: ReactNode;
}) {
  return (
    <SubscriptionContext.Provider value={subscription}>
      <KnowledgeBasesProvider
        initialKnowledgeBases={knowledgeBases}
        canLoad={subscription.canBuildKb}
      >
        {children}
      </KnowledgeBasesProvider>
    </SubscriptionContext.Provider>
  );
}
