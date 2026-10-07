"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import { signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import type { SubscriptionState } from "@/lib/hooks/useSubscription";
import { GUEST_SUBSCRIPTION_STATE } from "@/lib/subscription-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BypassContext = createContext(false);

export function useBypass(): boolean {
  return useContext(BypassContext);
}

export const SubscriptionContext = createContext<SubscriptionState | null>(null);

export const ProductSessionContext = createContext<Session | null>(null);

export function useAuthSession() {
  const productSession = useContext(ProductSessionContext);
  const clientSession = useSession();

  if (productSession) {
    return {
      data: productSession,
      status: productSession.user ? "authenticated" as const : "unauthenticated" as const,
      update: clientSession.update,
    };
  }

  return clientSession;
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
      <SubscriptionContext.Provider value={GUEST_SUBSCRIPTION_STATE}>
        {children}
      </SubscriptionContext.Provider>
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
  const { data: session, status } = useAuthSession();

  if (bypass) return <>{children}</>;
  if (status === "loading") return null;
  if (session?.user) return null;
  return <>{children}</>;
}

export function AppSignedIn({ children }: { children: React.ReactNode }) {
  const bypass = useBypass();
  const { data: session, status } = useAuthSession();

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
  const { data: session } = useAuthSession();

  if (bypass) return null;
  if (!session?.user) return null;

  const user = session.user;

  return (
    <Link
      href="/account"
      prefetch={false}
      className="inline-flex shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="Account settings"
    >
      <Avatar>
        {user.image && <AvatarImage src={user.image} alt="" />}
        <AvatarFallback>{userInitial(user)}</AvatarFallback>
      </Avatar>
    </Link>
  );
}

export function AppSignOutButton({
  className,
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
      className={cn(
        !className && buttonVariants({ variant: "ghost" }),
        className
      )}
      onClick={() => {
        onClick?.();
        void signOut({ callbackUrl: "/" });
      }}
    >
      Sign out
    </button>
  );
}
