"use client";

import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { KnowledgeBase, SavedResearch } from "@/lib/types";
import { ResearchesProvider } from "@/lib/contexts/ResearchesContext";
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
  researches,
  children,
}: {
  session: Session | null;
  subscription: SubscriptionState;
  knowledgeBases: KnowledgeBase[];
  researches: SavedResearch[];
  children: ReactNode;
}) {
  const canLoadResearches = Boolean(session?.user?.id);

  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
      <ProductSessionContext.Provider value={session}>
        <SubscriptionContext.Provider value={subscription}>
          <ResearchesProvider initialResearches={researches} canLoad={canLoadResearches}>
            <KnowledgeBasesProvider
              initialKnowledgeBases={knowledgeBases}
              canLoad={subscription.canBuildKb}
            >
              {children}
            </KnowledgeBasesProvider>
          </ResearchesProvider>
        </SubscriptionContext.Provider>
      </ProductSessionContext.Provider>
    </SessionProvider>
  );
}
