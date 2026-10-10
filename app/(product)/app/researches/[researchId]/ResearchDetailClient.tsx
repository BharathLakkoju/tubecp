"use client";

import { useMemo } from "react";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import ResearchResults from "@/components/ResearchResults";
import AppPage from "@/components/tubecp/AppPage";
import { buttonVariants } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/format-display-date";
import type { SavedResearchRecord } from "@/lib/types";

export default function ResearchDetailClient({ record }: { record: SavedResearchRecord }) {
  const ranked = useMemo(
    () =>
      [...record.result.rankedVideos].sort((a, b) => b.relevanceScore - a.relevanceScore),
    [record.result.rankedVideos]
  );

  return (
    <AppPage>
      <div className="flex flex-col gap-8">
        <Reveal tone="app" immediate className="flex flex-col gap-3">
          <Link
            href="/app/researches"
            prefetch={false}
            className="text-label text-primary underline-offset-2 hover:underline"
          >
            All researches
          </Link>
          <div className="flex flex-col gap-1">
            <p className="font-mono text-label text-foreground-secondary">Research</p>
            <h1 className="text-headline break-words text-foreground">{record.topic}</h1>
            <p className="font-mono text-label tabular-nums text-foreground-secondary">
              Saved {formatDisplayDate(record.createdAt)} · {record.rankedVideoCount} ranked videos
            </p>
          </div>
          <Link href="/app" prefetch={false} className={buttonVariants({ variant: "outline" })}>
            Run this topic again
          </Link>
        </Reveal>

        <ResearchResults
          research={record.result}
          ranked={ranked}
          selectable={false}
          selectedIds={new Set()}
          onToggle={() => {}}
          onSelectTop={() => {}}
          onSelectAll={() => {}}
          onClear={() => {}}
          topCount={0}
        />
      </div>
    </AppPage>
  );
}
