"use client";

import Link from "next/link";
import LiftCard from "@/components/motion/LiftCard";
import StatusBadge from "@/components/tubecp/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDisplayDate } from "@/lib/format-display-date";
import type { KnowledgeBase } from "@/lib/types";

function buildPercent(kb: KnowledgeBase): number {
  const job = kb.buildJob;
  if (!job || job.totalVideos <= 0) return 0;
  return Math.min(99, Math.round((job.processedVideos / job.totalVideos) * 100));
}

/** Knowledge base tile: whole card is one link (title link stretched via ::after). */
export default function KbTile({ kb }: { kb: KnowledgeBase }) {
  const pct = buildPercent(kb);

  return (
    <LiftCard className="h-full" lift={2}>
      <Card size="sm" className="relative h-full rounded-xl">
        <CardHeader>
          <CardTitle className="line-clamp-2 text-title-sm">
            <Link
              href={`/app/kb/${kb.kbId}`}
              prefetch={false}
              className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {kb.topic}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-auto flex flex-col gap-3">
          {kb.status === "building" && (
            <Progress value={pct} getAriaValueText={() => `Building, ${pct}%`} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {kb.status === "ready" ? (
              <StatusBadge status="done" />
            ) : kb.status === "building" ? (
              <StatusBadge status="running">Building {pct}%</StatusBadge>
            ) : (
              <StatusBadge status="failed" />
            )}
            <span className="font-mono text-caption tabular-nums text-muted-foreground">
              {formatDisplayDate(kb.createdAt)}
            </span>
          </div>
          {kb.status === "ready" && (
            <p className="font-mono text-label tabular-nums text-foreground-secondary">
              {kb.videosIndexed} videos · {Math.round(kb.totalMinutes)} min · {kb.chunksIndexed} chunks
            </p>
          )}
        </CardContent>
      </Card>
    </LiftCard>
  );
}
