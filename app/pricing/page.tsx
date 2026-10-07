import Link from "next/link";
import { Info } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/auth";
import { getPricingPlans } from "@/lib/plans";
import { getUserSubscription } from "@/lib/billing/subscription";
import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import HeroSection from "@/components/HeroSection";
import PricingPlans from "@/components/PricingPlans";
import Reveal from "@/components/motion/Reveal";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SearchParams = {
  checkout?: string;
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const checkoutCanceled = params.checkout === "canceled";
  const plans = getPricingPlans();

  const session = await auth();
  const subscription = session?.user?.id
    ? await getUserSubscription(session.user.id)
    : null;

  return (
    <MarketingLayout>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <main id="main-content" className="mx-auto w-full max-w-(--marketing-max) flex-1 px-4 pb-16 sm:px-6">
          {checkoutCanceled && (
            <Alert variant="info" role="status" className="mt-6">
              <Info weight="fill" aria-hidden />
              <AlertDescription className="text-foreground">
                Checkout was canceled. Your account remains on the free plan. You can upgrade again
                whenever you&apos;re ready.
              </AlertDescription>
            </Alert>
          )}

          <HeroSection
            align="center"
            showWordmark
            title="Simple, credit-based pricing"
            subtitle="Free tier gets ranked video lists. Paid plans unlock knowledge base builds and chat with cited sources."
          />

          <PricingPlans
            plans={plans}
            isLoggedIn={Boolean(session?.user?.id)}
            subscription={
              subscription
                ? {
                    planId: subscription.plan,
                    status: subscription.status,
                    periodEnd: subscription.periodEnd,
                    hasPolarSubscription: Boolean(subscription.polarSubscriptionId),
                  }
                : null
            }
          />

          <Reveal>
            <p className="mt-10 border-t pt-6 text-caption text-foreground-secondary">
              Paid plans renew monthly. Cancel anytime. Cancellation takes effect at the end of your
              billing period. All fees are non-refundable. See our{" "}
              <Link href="/refund" className="underline underline-offset-2">
                Cancellation Policy
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </Reveal>
        </main>
      </div>
    </MarketingLayout>
  );
}
