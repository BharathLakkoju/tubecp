"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import HeroSection from "@/components/HeroSection";
import EvalBenchmarkSection from "@/components/EvalBenchmarkSection";
import LiftCard from "@/components/motion/LiftCard";
import Reveal from "@/components/motion/Reveal";
import ScrollFrame from "@/components/motion/ScrollFrame";
import Stagger, { StaggerItem } from "@/components/motion/Stagger";
import PipelineRail from "@/components/tubecp/PipelineRail";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    index: "01",
    title: "Topic search",
    description:
      "Enter any research topic and tubecp scans YouTube to surface the most relevant videos for your question.",
  },
  {
    index: "02",
    title: "Ranked results",
    description:
      "Videos are scored by relevance and discussion depth so you spend time on signal, not scroll fatigue.",
  },
  {
    index: "03",
    title: "Chattable knowledge",
    description:
      "Paid plans transcribe videos into a knowledge base you can query. Every answer cites timestamped sources.",
  },
];

const STEPS = [
  {
    index: "01",
    title: "Search a topic",
    body: "Describe what you want to learn. tubecp expands your query and pulls candidate videos from YouTube.",
  },
  {
    index: "02",
    title: "Review ranked videos",
    body: "See relevance scores, channel context, and why each video matters before you commit to watching.",
  },
  {
    index: "03",
    title: "Chat with sources",
    body: "Build a knowledge base from transcripts and ask follow-up questions with linked citations.",
  },
];

/** Decorative product shot for the scroll frame. Static shapes only: no invented data. */
function ProductShot() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-2xl border bg-card p-5 shadow-3 sm:p-8"
    >
      <PipelineRail
        label="Example research pipeline"
        steps={[
          { id: "expand", label: "Expand queries", state: "done" },
          { id: "search", label: "Search YouTube", state: "done" },
          { id: "analyze", label: "Analyze videos", state: "active" },
          { id: "rank", label: "Rank", state: "pending" },
        ]}
      />
      <div className="flex flex-col gap-3">
        {[0.92, 0.81, 0.67].map((score, i) => (
          <div key={score} className="flex items-center gap-4 rounded-lg border bg-background p-3">
            <span className="w-5 font-mono text-label tabular-nums text-muted-foreground">{i + 1}</span>
            <div className="h-10 w-16 shrink-0 rounded-md bg-muted" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-2.5 w-3/4 rounded-full bg-muted" />
              <div className="h-2 w-1/3 rounded-full bg-muted/70" />
            </div>
            <div className="hidden w-28 items-center gap-2 sm:flex">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${score * 100}%` }} />
              </div>
              <span className="font-mono text-label tabular-nums text-foreground-secondary">
                {Math.round(score * 100)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <MarketingLayout>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />

        <main id="main-content" className="mx-auto w-full max-w-(--marketing-max) flex-1 px-4 pb-24 sm:px-6">
          <HeroSection
            align="center"
            animateTitle
            title="YouTube research, distilled into answers you can trust"
            subtitle="Search a topic, get videos ranked by how well they cover it, and chat with the best ones using cited sources."
          >
            <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/app" className={cn(buttonVariants({ size: "lg" }), "sm:min-w-44")}>
                Start researching
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Link>
              <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Sign in
              </Link>
            </div>
          </HeroSection>

          <ScrollFrame className="pb-20">
            <ProductShot />
          </ScrollFrame>

          <Reveal>
            <section id="features" aria-labelledby="features-heading" className="flex scroll-mt-24 flex-col gap-8 pt-12">
              <div className="flex max-w-2xl flex-col gap-3">
                <h2 id="features-heading" className="text-headline text-foreground">
                  Built for researchers who live on YouTube
                </h2>
                <p className="text-body text-foreground-secondary">
                  Skip the tab sprawl. tubecp turns hours of video into structured, searchable
                  knowledge: ranked, sourced, and ready to chat.
                </p>
              </div>

              <Stagger as="ul" className="grid gap-4 md:grid-cols-3">
                {FEATURES.map((feature) => (
                  <StaggerItem key={feature.index} as="li">
                    <LiftCard className="h-full" spotlight>
                      <Card className="h-full rounded-xl">
                        <CardHeader>
                          <span className="font-mono text-label tabular-nums text-primary">
                            {feature.index}
                          </span>
                          <CardTitle className="text-title-sm">{feature.title}</CardTitle>
                          <CardDescription className="text-body-sm">{feature.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    </LiftCard>
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          </Reveal>

          <Reveal>
            <section aria-labelledby="how-heading" className="flex flex-col gap-8 pt-24">
              <div className="flex max-w-2xl flex-col gap-3">
                <h2 id="how-heading" className="text-headline text-foreground">
                  How tubecp works
                </h2>
                <p className="text-body text-foreground-secondary">
                  From broad curiosity to cited answers in three steps.
                </p>
              </div>

              <Stagger as="ol" className="grid gap-4 md:grid-cols-3">
                {STEPS.map((item) => (
                  <StaggerItem key={item.index} as="li" className="flex flex-col gap-2 border-t pt-4">
                    <span className="font-mono text-label tabular-nums text-primary">{item.index}</span>
                    <h3 className="text-title-sm text-foreground">{item.title}</h3>
                    <p className="text-body-sm text-foreground-secondary">{item.body}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          </Reveal>

          <Reveal className="pt-24">
            <EvalBenchmarkSection />
          </Reveal>

          <Reveal>
            <section
              aria-labelledby="cta-heading"
              className="mt-24 flex flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-14 text-center"
            >
              <h2 id="cta-heading" className="text-headline text-foreground">
                Ready to research smarter?
              </h2>
              <p className="max-w-md text-body text-foreground-secondary">
                Create a free account and run your first ranked YouTube search today.
              </p>
              <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/app" className={cn(buttonVariants({ size: "lg" }), "sm:min-w-44")}>
                  Open app
                </Link>
                <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  View pricing
                </Link>
              </div>
            </section>
          </Reveal>
        </main>
      </div>
    </MarketingLayout>
  );
}
