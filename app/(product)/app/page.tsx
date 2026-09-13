import Link from "next/link";
import { getProductBootstrap } from "@/lib/server/product-bootstrap";
import HeroSection from "@/components/HeroSection";
import MobileNavToggle from "@/components/MobileNavToggle";
import AppResearchClient from "./AppResearchClient";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const params = await searchParams;
  const bootstrap = await getProductBootstrap();
  const showUpgraded = params.upgraded === "true";

  if (!bootstrap.session?.user) {
    return (
      <div className="app-panel">
        <div className="app-panel-scroll">
          <div className="app-inline-header-row mb-4 md:hidden">
            <MobileNavToggle />
          </div>
          <HeroSection
            align="center"
            showWordmark={false}
            title="Sign in to start researching"
            subtitle="Search YouTube by topic, rank relevant videos, and build chattable knowledge bases with cited sources."
          >
            <Link href="/sign-in" className="btn-primary" prefetch={false}>
              sign in to continue →
            </Link>
          </HeroSection>
        </div>
      </div>
    );
  }

  return <AppResearchClient showUpgradedBanner={showUpgraded} />;
}
