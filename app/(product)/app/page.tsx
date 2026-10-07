import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { getProductBootstrap } from "@/lib/server/product-bootstrap";
import AppPage from "@/components/tubecp/AppPage";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import AppResearchClient from "./AppResearchClient";

export default async function AppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const params = await searchParams;
  const bootstrap = await getProductBootstrap();
  const showUpgraded = params.upgraded === "true";

  if (!bootstrap.session?.user) {
    return (
      <AppPage>
        <Empty className="pt-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MagnifyingGlass aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              <h1>Sign in to start researching</h1>
            </EmptyTitle>
            <EmptyDescription>
              Search YouTube by topic, rank relevant videos, and build chattable knowledge bases
              with cited sources.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/sign-in" prefetch={false} className={buttonVariants()}>
              Sign in
            </Link>
          </EmptyContent>
        </Empty>
      </AppPage>
    );
  }

  return <AppResearchClient showUpgradedBanner={showUpgraded} />;
}
