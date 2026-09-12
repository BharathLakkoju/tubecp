"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import type { SubscriptionState } from "@/lib/hooks/useSubscription";
import {
  GUEST_SUBSCRIPTION_STATE,
  subscriptionStateFromRecord,
} from "@/lib/subscription-state";

const BypassContext = createContext(false);

export function useBypass(): boolean {
  return useContext(BypassContext);
}

export const SubscriptionContext = createContext<SubscriptionState | null>(null);

function SessionSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [state, setState] = useState<SubscriptionState>({
    ...GUEST_SUBSCRIPTION_STATE,
    loading: true,
  });

  useEffect(() => {
    if (!session?.user) {
      setState(GUEST_SUBSCRIPTION_STATE);
      return;
    }

    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((data) => {
        if (!data.subscription) return;
        setState(subscriptionStateFromRecord(data.subscription));
      })
      .catch(() => setState(GUEST_SUBSCRIPTION_STATE));
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
        <SubscriptionContext.Provider value={GUEST_SUBSCRIPTION_STATE}>
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
