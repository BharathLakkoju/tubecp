"use client";

import { SessionProvider } from "next-auth/react";
import MarketingAmbientBackground from "@/components/motion/MarketingAmbientBackground";
import PageShell from "@/components/PageShell";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <PageShell>
        <MarketingAmbientBackground />
        {children}
      </PageShell>
    </SessionProvider>
  );
}
