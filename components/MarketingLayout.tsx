"use client";

import { SessionProvider } from "next-auth/react";
import PageShell from "@/components/PageShell";

export default function MarketingLayout({
  children,
  showThemeSwitcher = true,
}: {
  children: React.ReactNode;
  showThemeSwitcher?: boolean;
}) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <PageShell showThemeSwitcher={showThemeSwitcher}>{children}</PageShell>
    </SessionProvider>
  );
}
