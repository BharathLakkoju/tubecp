"use client";

import Link from "next/link";
import { Books, Plus } from "@phosphor-icons/react";
import Reveal from "@/components/motion/Reveal";
import Stagger, { StaggerItem } from "@/components/motion/Stagger";
import AppPage from "@/components/tubecp/AppPage";
import KbTile from "@/components/tubecp/KbTile";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";
import { useSubscription } from "@/lib/hooks/useSubscription";

/** Knowledge base index (design system 8.4): bento tiles, or an empty state with one next action. */
export default function KbListClient() {
  const { knowledgeBases, loading } = useKnowledgeBases();
  const sub = useSubscription();

  return (
    <AppPage>
      <div className="flex flex-col gap-8">
        <Reveal tone="app" immediate className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-headline text-foreground">Knowledge bases</h1>
            <p className="text-body text-foreground-secondary">
              Chat with the videos you researched, with cited sources.
            </p>
          </div>
          {knowledgeBases.length > 0 && (
            <Link href="/app" prefetch={false} className={buttonVariants()}>
              <Plus data-icon="inline-start" weight="bold" aria-hidden />
              New research
            </Link>
          )}
        </Reveal>

        {loading && knowledgeBases.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : knowledgeBases.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Books aria-hidden />
              </EmptyMedia>
              <EmptyTitle>
                <h2>No knowledge bases yet</h2>
              </EmptyTitle>
              <EmptyDescription>
                {sub.canBuildKb || sub.loading
                  ? "Research a topic, pick the best videos, and build one in a few minutes."
                  : "Knowledge bases are on paid plans. Research a topic for free, or see plans to unlock them."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/app" prefetch={false} className={buttonVariants()}>
                Start a research
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <Stagger tone="app" immediate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {knowledgeBases.map((kb, index) => (
              <StaggerItem key={kb.kbId} index={index} tone="app">
                <KbTile kb={kb} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </AppPage>
  );
}
