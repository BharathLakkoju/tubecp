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
import RelevanceMeter from "@/components/tubecp/RelevanceMeter";
import VideoResultSkeleton from "@/components/tubecp/VideoResultSkeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Spinner } from "@/components/ui/spinner";
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

/**
 * Public YouTube examples for the marketing product shot. Relevance scores are illustrative only
 * (not output from a live tubecp research run).
 */
const PRODUCT_SHOT_RESULTS = [
  {
    rank: 1,
    videoId: "q1D90-uGvBg",
    title: "You're using AI agents wrong",
    channel: "Theo - t3․gg",
    duration: "49:22",
    score: 94,
    detail: "Hands-on multi-agent workflow, remote dev boxes, and shipping without babysitting threads",
  },
  {
    rank: 2,
    videoId: "_zdroS0Hc74",
    title: "AIE Europe Keynotes & Coding Agents",
    channel: "AI Engineer",
    duration: "Keynote",
    score: 88,
    detail: "Industry keynotes on coding agents, evals, and production AI engineering",
  },
  {
    rank: 3,
    videoId: "YkOSUVzOAA4",
    title: "T3 Stack Tutorial — FROM 0 TO PROD FOR $0",
    channel: "Theo - t3․gg",
    duration: "2:59:03",
    score: 86,
    detail: "Full-stack TypeScript walkthrough with Next.js, tRPC, Tailwind, and Prisma",
  },
] as const;

/** Decorative product shot for the scroll frame: animated pipeline + shimmering skeletons. */
function ProductShot() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-2xl border bg-card p-5 shadow-3 sm:p-8"
    >
      <p className="font-mono text-caption text-foreground-secondary">
        Example topic:{" "}
        <span className="text-foreground">AI agents &amp; TypeScript for developers</span>
      </p>

      <PipelineRail
        label="Example research pipeline"
        className="sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2"
        steps={[
          { id: "expand", label: "Expand queries", state: "done" },
          { id: "search", label: "Search YouTube", state: "done", count: "18/18" },
          { id: "analyze", label: "Analyze videos", state: "active", count: "11/20" },
          { id: "rank", label: "Rank", state: "pending" },
        ]}
      />

      <Marker className="text-body-sm">
        <MarkerIcon>
          <Spinner />
        </MarkerIcon>
        <MarkerContent className="shimmer">
          Ranking Theo, AI Engineer, and related engineering talks…
        </MarkerContent>
      </Marker>

      <Stagger
        tone="app"
        className="flex min-w-0 flex-col divide-y overflow-x-clip rounded-lg border bg-background"
      >
        {PRODUCT_SHOT_RESULTS.map((video, index) => (
          <StaggerItem key={video.rank} index={index} tone="app" as="div">
            <Item
              variant="default"
              className="rounded-none px-4 py-3 max-sm:flex-col max-sm:items-stretch"
            >
              <span
                aria-hidden="true"
                className="w-6 shrink-0 font-mono text-label tabular-nums text-muted-foreground max-sm:hidden"
              >
                {String(video.rank).padStart(2, "0")}
              </span>
              <ItemMedia
                variant="image"
                className="h-[68px] w-[120px] shrink-0 overflow-hidden max-sm:aspect-video max-sm:h-auto max-sm:w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                  alt=""
                  width={120}
                  height={68}
                  className="size-full object-cover"
                />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className="line-clamp-2 whitespace-normal text-title-sm">
                  {video.title}
                </ItemTitle>
                <ItemDescription className="line-clamp-1">
                  {video.channel}
                  <span className="font-mono tabular-nums text-muted-foreground"> · {video.duration}</span>
                </ItemDescription>
                <ItemDescription className="line-clamp-1 text-foreground-secondary">
                  {video.detail}
                </ItemDescription>
              </ItemContent>
              <RelevanceMeter score={video.score} className="shrink-0 max-sm:mt-2" />
            </Item>
          </StaggerItem>
        ))}
        <StaggerItem index={3} tone="app" as="div">
          <VideoResultSkeleton rank={4} />
        </StaggerItem>
      </Stagger>
    </div>
  );
}

export default function LandingPage() {
  return (
    <MarketingLayout>
      <div className="flex flex-col">
        <SiteNav variant="landing" />

        <main
          id="main-content"
          className="mx-auto w-full max-w-(--marketing-max) flex-1 px-4 pb-16 sm:px-6 sm:pb-20"
        >
          <HeroSection
            align="center"
            animateTitle
            title="YouTube research, distilled into answers you can trust"
            subtitle="Research engineering talks, conference keynotes, and deep-dive tutorials on YouTube—ranked by relevance, then chat with cited sources on paid plans."
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

          <Reveal className="pt-24 pb-8">
            <EvalBenchmarkSection />
          </Reveal>

          <Reveal>
            <section
              aria-labelledby="cta-heading"
              className="mt-16 flex flex-col items-center gap-5 rounded-2xl border bg-card px-6 py-14 text-center sm:mt-20"
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
