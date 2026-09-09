"use client";

import Link from "next/link";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ClerkProvider,
  Show,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { useTheme } from "@/components/ThemeProvider";
import { buildClerkAppearance } from "@/lib/clerkTheme";
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

function ClerkProviderWithTheme({ children }: { children: React.ReactNode }) {
  const { themeId } = useTheme();
  const appearance = useMemo(() => buildClerkAppearance(themeId), [themeId]);

  return (
    <ClerkProvider appearance={appearance}>
      <ClerkSubscriptionProvider>{children}</ClerkSubscriptionProvider>
    </ClerkProvider>
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
      <ClerkProviderWithTheme>{children}</ClerkProviderWithTheme>
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
  return <Show when="signed-out">{children}</Show>;
}

export function AppSignedIn({ children }: { children: React.ReactNode }) {
  const bypass = useBypass();
  if (bypass) return null;
  return <Show when="signed-in">{children}</Show>;
}

/** @deprecated Prefer `<Link href="/sign-in">` — always navigates to the sign-in page. */
export function AppSignInButton({
  children,
  mode: _mode,
}: {
  children: React.ReactNode;
  mode?: "modal" | "redirect";
}) {
  const bypass = useBypass();
  if (bypass) return <>{children}</>;

  const child = Children.only(children);
  if (isValidElement<{ className?: string; children?: React.ReactNode }>(child)) {
    return (
      <Link href="/sign-in" className={child.props.className}>
        {child.props.children}
      </Link>
    );
  }

  return <Link href="/sign-in">{children}</Link>;
}

export function AppUserButton() {
  const bypass = useBypass();
  if (bypass) return null;
  return <UserButton />;
}
