"use client";

import Link from "next/link";
import MarketingLayout from "@/components/MarketingLayout";
import SiteNav from "@/components/SiteNav";
import HeroSection from "@/components/HeroSection";
import FadeIn from "@/components/FadeIn";
import ScrollReveal from "@/components/ScrollReveal";
import Stagger, { StaggerItem } from "@/components/Stagger";

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
      "Pro plans transcribe videos into a knowledge base you can query — every answer cites timestamped sources.",
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

export default function LandingPage() {
  return (
    <MarketingLayout showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav variant="landing" />

        <main className="page-container flex-1">
          <FadeIn>
            <HeroSection
              align="center"
              showWordmark={false}
              title="YouTube research, distilled into answers you can trust"
            >
              <div className="btn-row mx-auto max-w-md max-sm:max-w-full">
                <Link href="/app" className="btn-primary">
                  start researching →
                </Link>
                <Link href="/sign-in" className="btn-ghost">
                  sign in
                </Link>
              </div>
            </HeroSection>
          </FadeIn>

          <ScrollReveal>
            <section id="features" className="pt-10">
              <h2 className="section-title">Built for researchers who live on YouTube</h2>
              <p className="section-desc">
                Skip the tab sprawl. tubecp turns hours of video into structured,
                searchable knowledge — ranked, sourced, and ready to chat.
              </p>

              <Stagger as="ul">
                {FEATURES.map((feature) => (
                  <StaggerItem key={feature.index} as="li" className="list-row">
                    <span className="list-index">{feature.index}</span>
                    <div>
                      <strong className="mb-1 block font-mono text-sm font-semibold text-text">
                        {feature.title}
                      </strong>
                      <p className="font-mono text-[13px] leading-relaxed text-text-muted">
                        {feature.description}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <section className="pt-10">
              <h2 className="section-title">How tubecp works</h2>
              <p className="section-desc">From broad curiosity to cited answers in three steps.</p>

              <Stagger as="ul">
                {STEPS.map((item) => (
                  <StaggerItem key={item.index} as="li" className="list-row">
                    <span className="list-index">{item.index}</span>
                    <div>
                      <strong className="mb-1 block font-mono text-sm font-semibold text-text">
                        {item.title}
                      </strong>
                      <p className="font-mono text-[13px] leading-relaxed text-text-muted">{item.body}</p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <section className="pt-10">
              <hr className="divider" />
              <h2 className="section-title mt-10">Ready to research smarter?</h2>
              <p className="section-desc">
                Create a free account and run your first ranked YouTube search today.
              </p>
              <div className="btn-row mx-auto max-w-md max-sm:max-w-full">
                <Link href="/app" className="btn-primary">
                  open app →
                </Link>
                <Link href="/pricing" className="btn-ghost">
                  view pricing
                </Link>
              </div>
            </section>
          </ScrollReveal>
        </main>
      </div>
    </MarketingLayout>
  );
}
