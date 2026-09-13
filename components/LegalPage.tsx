import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import FadeIn from "@/components/FadeIn";
import HeroSection from "@/components/HeroSection";

interface Props {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, lastUpdated, children }: Props) {
  return (
    <MarketingLayout showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <article className="page-container flex-1">
          <FadeIn>
            <HeroSection
              align="center"
              showWordmark
              title={title}
              subtitle={`Last updated: ${lastUpdated}`}
            />
          </FadeIn>

          <FadeIn delay={0.06}>
            <div className="mt-6 border border-border">
              <div className="legal-content bg-surface px-6 py-8 max-sm:px-4 max-sm:py-6">{children}</div>
            </div>
          </FadeIn>
        </article>
      </div>
    </MarketingLayout>
  );
}
