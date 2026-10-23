"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

/** Hydrates NextAuth session on marketing and auth routes (product routes still pass bootstrap session). */
export default function AuthSessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </SessionProvider>
  );
}
