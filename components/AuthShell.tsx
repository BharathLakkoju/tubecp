"use client";

import Link from "next/link";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
} from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
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

function SessionSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [state, setState] = useState<SubscriptionState>({
    ...E2E_SUBSCRIPTION,
    loading: true,
  });

  useEffect(() => {
    if (!session?.user) {
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
  }, [session?.user]);

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
      <SessionProvider>
        <SessionSubscriptionProvider>{children}</SessionSubscriptionProvider>
      </SessionProvider>
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
  const { data: session, status } = useSession();

  if (bypass) return <>{children}</>;
  if (status === "loading") return null;
  if (session?.user) return null;
  return <>{children}</>;
}

export function AppSignedIn({ children }: { children: React.ReactNode }) {
  const bypass = useBypass();
  const { data: session, status } = useSession();

  if (bypass) return null;
  if (status === "loading") return null;
  if (!session?.user) return null;
  return <>{children}</>;
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

function userInitial(user: { name?: string | null; email?: string | null }): string {
  const source = user.name?.trim() || user.email?.trim() || "?";
  return source[0]?.toUpperCase() ?? "?";
}

export function AppUserButton() {
  const bypass = useBypass();
  const { data: session } = useSession();

  if (bypass) return null;
  if (!session?.user) return null;

  const user = session.user;

  return (
    <Link
      href="/account"
      className="inline-flex size-8.5 shrink-0 items-center justify-center overflow-hidden border border-border bg-surface no-underline transition-[border-color] duration-150 hover:border-text-muted"
      aria-label="Account settings"
    >
      {user.image ? (
        <img
          src={user.image}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <span className="font-mono text-[13px] font-medium text-text-muted">
          {userInitial(user)}
        </span>
      )}
    </Link>
  );
}

export function AppSignOutButton({
  className = "nav-tab",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const bypass = useBypass();

  if (bypass) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onClick?.();
        void signOut({ callbackUrl: "/" });
      }}
    >
      sign out
    </button>
  );
}
