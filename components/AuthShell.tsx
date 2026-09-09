"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import type { PlanId } from "@/lib/plans";
import type { SubscriptionState } from "@/lib/hooks/useSubscription";

const BypassContext = createContext(false);

export function useBypass(): boolean {
  return useContext(BypassContext);
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

const E2E_SUBSCRIPTION: SubscriptionState = {
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

function ClerkSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    ...E2E_SUBSCRIPTION,
    loading: true,
  });

  useEffect(() => {
    if (!isSignedIn) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((data) => {
        if (!data.plan) return;
        setState({
          plan: data.subscription.plan as PlanId,
          planName: data.plan.name,
          kbBuildsUsed: data.usage.kbBuildsUsed,
          kbBuildsLimit: data.limits.kbBuildsPerMonth,
          chatUsed: data.usage.chatMessagesUsed,
          chatLimit: data.limits.chatMessagesPerMonth,
          researchUsedToday: data.usage.researchUsedToday,
          researchLimit: data.limits.researchPerDay,
          canBuildKb: data.limits.kbBuildsPerMonth > 0,
          canChat: data.limits.chatMessagesPerMonth > 0,
          loading: false,
        });
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, [isSignedIn]);

  return (
    <SubscriptionContext.Provider value={state}>{children}</SubscriptionContext.Provider>
  );
}

export function AuthProvider({
  children,
  e2eBypass = false,
}: {
  children: React.ReactNode;
  e2eBypass?: boolean;
}) {
  if (e2eBypass) {
    return (
      <BypassContext.Provider value={true}>
        <SubscriptionContext.Provider value={E2E_SUBSCRIPTION}>
          {children}
        </SubscriptionContext.Provider>
      </BypassContext.Provider>
    );
  }

  return (
    <BypassContext.Provider value={false}>
      <ClerkProvider>
        <ClerkSubscriptionProvider>{children}</ClerkSubscriptionProvider>
      </ClerkProvider>
    </BypassContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionState {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within AuthProvider");
  }
  return ctx;
}

export function AppSignedOut({ children }: { children: React.ReactNode }) {
  const bypass = useBypass();
  if (bypass) return <>{children}</>;
  return <SignedOut>{children}</SignedOut>;
}

export function AppSignedIn({ children }: { children: React.ReactNode }) {
  const bypass = useBypass();
  if (bypass) return null;
  return <SignedIn>{children}</SignedIn>;
}

export function AppSignInButton({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode?: "modal" | "redirect";
}) {
  const bypass = useBypass();
  if (bypass) return <>{children}</>;
  return <SignInButton mode={mode}>{children}</SignInButton>;
}

export function AppUserButton({ afterSignOutUrl }: { afterSignOutUrl?: string }) {
  const bypass = useBypass();
  if (bypass) return null;
  return <UserButton afterSignOutUrl={afterSignOutUrl} />;
}
