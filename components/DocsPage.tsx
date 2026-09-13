import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import FadeIn from "@/components/FadeIn";
import HeroSection from "@/components/HeroSection";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function DocsPage({ title, subtitle, children }: Props) {
  return (
    <MarketingLayout showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <article className="page-container flex-1">
          <FadeIn>
            <HeroSection align="center" showWordmark title={title} subtitle={subtitle} />
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
