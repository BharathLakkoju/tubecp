import Link from "next/link";
import { auth } from "@/auth";
import { getPricingPlans } from "@/lib/plans";
import { getUserSubscription } from "@/lib/billing/subscription";
import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import HeroSection from "@/components/HeroSection";
import FadeIn from "@/components/FadeIn";
import PricingPlans from "@/components/PricingPlans";
import { cn } from "@/lib/cn";

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
  const useWideLayout = plans.length >= 4;

  const session = await auth();
  const subscription = session?.user?.id
    ? await getUserSubscription(session.user.id)
    : null;

  return (
    <MarketingLayout showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div className={cn("flex-1", useWideLayout ? "page-container-wide" : "page-container")}>
          {checkoutCanceled && (
            <p className="mb-6 border border-border bg-surface px-4 py-3 font-mono text-[13px] text-text-muted">
              Checkout was canceled. Your account remains on the free plan — you can upgrade again
              whenever you&apos;re ready.
            </p>
          )}
          <FadeIn>
            <HeroSection
              align="center"
              showWordmark
              title="Simple, credit-based pricing"
              subtitle="Free tier gets ranked video lists. Paid plans unlock knowledge base builds and chat with cited sources."
            />
          </FadeIn>

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

          <p className="mt-10 border-t border-border pt-6 font-mono text-xs leading-relaxed text-text-muted">
            Paid plans renew monthly. Cancel anytime—cancellation takes effect at the end of your
            billing period. All fees are non-refundable. See our{" "}
            <Link href="/refund">Cancellation Policy</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
