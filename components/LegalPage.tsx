import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import HeroSection from "@/components/HeroSection";
import Reveal from "@/components/motion/Reveal";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, lastUpdated, children }: Props) {
  return (
    <MarketingLayout>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <article id="main-content" className="mx-auto w-full max-w-(--reading-max) flex-1 px-4 pb-16 sm:px-6">
          <HeroSection align="center" title={title} subtitle={`Last updated: ${lastUpdated}`} />

          <Reveal>
            <Card>
              <CardContent className="prose-tubecp">{children}</CardContent>
            </Card>
          </Reveal>
        </article>
      </div>
    </MarketingLayout>
  );
}
