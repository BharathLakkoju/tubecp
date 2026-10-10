"use client";

import Link from "next/link";
import Stagger, { StaggerItem } from "@/components/motion/Stagger";
import ResearchTile from "@/components/tubecp/ResearchTile";
import { useResearches } from "@/lib/hooks/useResearches";

const RECENT_LIMIT = 3;

export default function RecentResearchesSection() {
  const { researches, loading } = useResearches();
  const recent = researches.slice(0, RECENT_LIMIT);

  if (loading && researches.length === 0) return null;
  if (recent.length === 0) return null;

  return (
    <section aria-labelledby="recent-researches" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recent-researches" className="text-title text-foreground">
          Researches
        </h2>
        {researches.length > RECENT_LIMIT && (
          <Link
            href="/app/researches"
            prefetch={false}
            className="text-label text-primary underline-offset-2 hover:underline"
          >
            View all
          </Link>
        )}
      </div>
      <Stagger tone="app" immediate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((research, index) => (
          <StaggerItem key={research.researchId} index={index} tone="app">
            <ResearchTile research={research} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
