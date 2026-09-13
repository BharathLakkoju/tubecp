"use client";

import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { KnowledgeBase } from "@/lib/types";
import type { SubscriptionState } from "@/lib/hooks/useSubscription";
import {
  ProductSessionContext,
  SubscriptionContext,
} from "@/components/AuthShell";
import { KnowledgeBasesProvider } from "@/lib/contexts/KnowledgeBasesContext";

export default function ProductBootstrap({
  session,
  subscription,
  knowledgeBases,
  children,
}: {
  session: Session | null;
  subscription: SubscriptionState;
  knowledgeBases: KnowledgeBase[];
  children: ReactNode;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
      <ProductSessionContext.Provider value={session}>
        <SubscriptionContext.Provider value={subscription}>
          <KnowledgeBasesProvider
            initialKnowledgeBases={knowledgeBases}
            canLoad={subscription.canBuildKb}
          >
            {children}
          </KnowledgeBasesProvider>
        </SubscriptionContext.Provider>
      </ProductSessionContext.Provider>
    </SessionProvider>
  );
}
