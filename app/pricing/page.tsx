import Link from "next/link";
import { PLANS } from "@/lib/plans";
import PageShell from "@/components/PageShell";
import SiteNav from "@/components/SiteNav";
import HeroSection from "@/components/HeroSection";
import FadeIn from "@/components/FadeIn";
import { cn } from "@/lib/cn";

export default function PricingPage() {
  const plans = [PLANS.free, PLANS.pro, PLANS.researcher];

  return (
    <PageShell showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <div className="page-container flex-1">
        <FadeIn>
        <HeroSection
          align="center"
          showWordmark
          title="Simple, credit-based pricing"
          subtitle="Free tier gets ranked video lists. Paid plans unlock knowledge base builds and chat with cited sources."
        />
        </FadeIn>

        <div className="mt-6 grid grid-cols-3 border border-border max-lg:grid-cols-1">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              style={{ "--motion-index": index } as React.CSSProperties}
              className={cn(
                "motion-stagger-item relative flex flex-col border-r border-border bg-surface p-5 last:border-r-0 max-lg:border-r-0 max-lg:border-b max-lg:last:border-b-0",
                plan.id === "pro" && "bg-bg"
              )}
            >
              {plan.id === "pro" && (
                <span className="on-accent-fill absolute top-0 right-0 left-0 px-2 py-1 text-center font-mono text-[10px] font-medium tracking-wide uppercase">
                  most popular
                </span>
              )}
              <h2 className={cn("font-mono text-sm font-semibold text-text", plan.id === "pro" && "mt-4")}>
                {plan.name}
              </h2>
              <p className="my-4 font-mono text-[28px] font-semibold text-text max-sm:text-2xl">
                ${plan.priceMonthly}
                <span className="text-xs font-normal text-text-muted">/mo</span>
              </p>
              <ul className="mb-5 flex-1">
                <li className="border-t border-border py-2 font-mono text-xs text-text-muted">
                  {plan.researchPerDay} researches / day
                </li>
                <li className="border-t border-border py-2 font-mono text-xs text-text-muted">
                  {plan.kbBuildsPerMonth} KB builds / month
                </li>
                <li className="border-t border-border py-2 font-mono text-xs text-text-muted">
                  {plan.chatMessagesPerMonth} chat messages / month
                </li>
                <li className="border-t border-border py-2 font-mono text-xs text-text-muted">
                  {plan.persistentKbs ? "Persistent knowledge bases" : "Ranked lists only"}
                </li>
              </ul>
              <div className="mt-auto flex flex-col gap-3">
                {plan.id === "free" ? (
                  <Link href="/sign-up" className="btn-ghost btn-block">
                    get started free →
                  </Link>
                ) : (
                  <Link
                    href={`/api/checkout?plan=${plan.id}`}
                    className="btn-primary btn-block"
                  >
                    upgrade to {plan.name} →
                  </Link>
                )}
                {plan.id !== "free" ? (
                  <p className="min-h-[4.5rem] text-center font-mono text-[11px] leading-snug text-text-muted">
                    By upgrading, you agree to our{" "}
                    <Link href="/terms" className="text-text-muted underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/refund" className="text-text-muted underline">
                      Cancellation Policy
                    </Link>
                    . Payments are processed by{" "}
                    <a
                      href="https://polar.sh"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted underline"
                    >
                      Polar
                    </a>{" "}
                    as merchant of record.
                  </p>
                ) : (
                  <p
                    className="min-h-[4.5rem] text-center font-mono text-[11px] leading-snug text-transparent select-none"
                    aria-hidden="true"
                  >
                    &nbsp;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 border-t border-border pt-6 font-mono text-xs leading-relaxed text-text-muted">
          Paid plans renew monthly. Cancel anytime—cancellation takes effect at the end of your
          billing period. All fees are non-refundable. See our{" "}
          <Link href="/refund">Cancellation Policy</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
        </div>
      </div>
    </PageShell>
  );
}
