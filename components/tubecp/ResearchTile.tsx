"use client";

import Link from "next/link";
import LiftCard from "@/components/motion/LiftCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayDate } from "@/lib/format-display-date";
import type { SavedResearch } from "@/lib/types";

export default function ResearchTile({ research }: { research: SavedResearch }) {
  return (
    <LiftCard className="h-full" lift={2}>
      <Card size="sm" className="relative h-full rounded-xl">
        <CardHeader>
          <CardTitle className="line-clamp-2 text-title-sm">
            <Link
              href={`/app/researches/${research.researchId}`}
              prefetch={false}
              className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {research.topic}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-auto flex flex-wrap items-center justify-between gap-2 font-mono text-label tabular-nums text-foreground-secondary">
          <span>
            {research.rankedVideoCount} ranked · {research.videosSearched} searched
          </span>
          <time dateTime={research.createdAt}>{formatDisplayDate(research.createdAt)}</time>
        </CardContent>
      </Card>
    </LiftCard>
  );
}
