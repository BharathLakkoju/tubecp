import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import HeroSection from "@/components/HeroSection";
import Reveal from "@/components/motion/Reveal";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function DocsPage({ title, subtitle, children }: Props) {
  return (
    <MarketingLayout>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />
        <article id="main-content" className="mx-auto w-full max-w-(--content-max) flex-1 px-4 pb-16 sm:px-6">
          <HeroSection align="center" title={title} subtitle={subtitle} />

          <Reveal>
            <Card>
              <CardContent className="prose-tubecp mx-auto w-full max-w-(--reading-max)">
                {children}
              </CardContent>
            </Card>
          </Reveal>
        </article>
      </div>
    </MarketingLayout>
  );
}
