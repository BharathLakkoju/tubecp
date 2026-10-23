"use client";

import MarketingAmbientBackground from "@/components/motion/MarketingAmbientBackground";
import PageShell from "@/components/PageShell";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell>
      <MarketingAmbientBackground />
      {children}
    </PageShell>
  );
}
