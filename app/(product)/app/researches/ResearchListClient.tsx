"use client";

import Link from "next/link";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import Reveal from "@/components/motion/Reveal";
import Stagger, { StaggerItem } from "@/components/motion/Stagger";
import AppPage from "@/components/tubecp/AppPage";
import ResearchTile from "@/components/tubecp/ResearchTile";
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
import { useResearches } from "@/lib/hooks/useResearches";

export default function ResearchListClient() {
  const { researches, loading } = useResearches();

  return (
    <AppPage>
      <div className="flex flex-col gap-8">
        <Reveal tone="app" immediate className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-headline text-foreground">Researches</h1>
            <p className="text-body text-foreground-secondary">
              Revisit ranked videos from past runs — copy links anytime.
            </p>
          </div>
          {researches.length > 0 && (
            <Link href="/app" prefetch={false} className={buttonVariants()}>
              <Plus data-icon="inline-start" weight="bold" aria-hidden />
              New research
            </Link>
          )}
        </Reveal>

        {loading && researches.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : researches.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MagnifyingGlass aria-hidden />
              </EmptyMedia>
              <EmptyTitle>
                <h2>No saved researches yet</h2>
              </EmptyTitle>
              <EmptyDescription>
                Run a topic on the home page. When research finishes, it appears here with ranked
                videos and copyable links.
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
            {researches.map((research, index) => (
              <StaggerItem key={research.researchId} index={index} tone="app">
                <ResearchTile research={research} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </AppPage>
  );
}
