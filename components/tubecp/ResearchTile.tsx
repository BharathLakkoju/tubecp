"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import LiftCard from "@/components/motion/LiftCard";
import InlineConfirm from "@/components/tubecp/InlineConfirm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteSavedResearch } from "@/lib/client/saved-research";
import { formatDisplayDate } from "@/lib/format-display-date";
import { useResearches } from "@/lib/hooks/useResearches";
import { hrefForSavedResearch, knowledgeBaseIdFromResearchId } from "@/lib/researches";
import type { SavedResearch } from "@/lib/types";

export default function ResearchTile({ research }: { research: SavedResearch }) {
  const router = useRouter();
  const { removeResearch } = useResearches();
  const [confirming, setConfirming] = useState(false);
  const href = hrefForSavedResearch(research.researchId);
  const isKbMirror = knowledgeBaseIdFromResearchId(research.researchId) !== null;

  const handleDelete = async () => {
    await deleteSavedResearch(research.researchId);
    removeResearch(research.researchId);
    router.refresh();
  };

  return (
    <LiftCard className="h-full" lift={2}>
      <Card size="sm" className="relative h-full rounded-xl">
        <CardHeader className="gap-2">
          <div className="flex items-start gap-2">
            <CardTitle className="line-clamp-2 flex-1 text-title-sm">
              <Link
                href={href}
                prefetch={false}
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                {research.topic}
              </Link>
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="relative z-10 shrink-0 text-foreground-secondary hover:text-destructive"
              aria-label={isKbMirror ? `Remove ${research.topic} from library` : `Delete ${research.topic}`}
              onClick={() => setConfirming(true)}
            >
              <Trash aria-hidden />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="mt-auto flex flex-wrap items-center justify-between gap-2 font-mono text-label tabular-nums text-foreground-secondary">
          <span>
            {research.rankedVideoCount} ranked · {research.videosSearched} searched
          </span>
          <time dateTime={research.createdAt}>{formatDisplayDate(research.createdAt)}</time>
        </CardContent>
        <InlineConfirm
          open={confirming}
          onOpenChange={setConfirming}
          title={`Remove "${research.topic}"?`}
          description={
            isKbMirror
              ? "Removes this entry from your research library. Your knowledge base is unchanged."
              : "This deletes the saved ranked results for this research."
          }
          onConfirm={handleDelete}
        />
      </Card>
    </LiftCard>
  );
}
