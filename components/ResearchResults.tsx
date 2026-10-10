"use client";

import { CaretRight } from "@phosphor-icons/react";
import CopyButton from "@/components/CopyButton";
import RankedVideoList from "@/components/tubecp/RankedVideoList";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { RankedVideo, ResearchResult } from "@/lib/types";

interface Props {
  research: ResearchResult;
  /** Videos sorted by relevance, highest first. */
  ranked: RankedVideo[];
  selectable: boolean;
  selectedIds: ReadonlySet<string>;
  onToggle: (videoId: string, selected: boolean) => void;
  onSelectTop: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  topCount: number;
}

function DisclosureTrigger({ children }: { children: React.ReactNode }) {
  return (
    <CollapsibleTrigger
      render={
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-foreground-secondary data-panel-open:[&>svg]:rotate-90"
        />
      }
    >
      <CaretRight
        aria-hidden
        className="transition-transform duration-(--duration-base)"
      />
      {children}
    </CollapsibleTrigger>
  );
}

/** Final research output (design system 8.2): ranked list first, process details tucked away. */
export default function ResearchResults({
  research,
  ranked,
  selectable,
  selectedIds,
  onToggle,
  onSelectTop,
  onSelectAll,
  onClear,
  topCount,
}: Props) {
  const scores = Object.fromEntries(ranked.map((video) => [video.videoId, video.relevanceScore]));
  const rankedLinksText = ranked.map((video) => video.url).join("\n");

  return (
    <div className="flex flex-col gap-6">
      {selectable && ranked.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Selection shortcuts">
          <Button variant="outline" size="sm" onClick={onSelectTop}>
            Select top {Math.min(topCount, ranked.length)}
          </Button>
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            Select all
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {ranked.length > 0 && (
          <div className="flex justify-end">
            <CopyButton text={rankedLinksText} label="Copy all links" />
          </div>
        )}
        <RankedVideoList
          title="Best matches"
          caption={`${ranked.length} relevant of ${research.allVideos.length} found · sorted by relevance`}
          videos={ranked}
          scores={scores}
          numbered
          selectable={selectable}
          selectedIds={selectedIds}
          onToggle={onToggle}
          pageSize={10}
          copyable
          emptyMessage="No videos met the relevance threshold for this topic. Try a broader topic."
        />
      </div>

      <div className="flex flex-col gap-1">
        <Collapsible>
          <DisclosureTrigger>
            Show all scraped{" "}
            <span className="font-mono tabular-nums">({research.allVideos.length})</span>
          </DisclosureTrigger>
          <CollapsibleContent>
            <div className="pt-2">
              <RankedVideoList
                title="All videos scraped"
                videos={research.allVideos}
                emptyMessage="No videos were returned from YouTube search."
                maxHeightClass="max-h-[28rem]"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {research.queriesUsed.length > 0 && (
          <Collapsible>
            <DisclosureTrigger>How we searched</DisclosureTrigger>
            <CollapsibleContent>
              <QueryList queries={research.queriesUsed} />
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

export function QueryList({ queries }: { queries: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2 pt-2" aria-label="Search queries used">
      {queries.map((query) => (
        <li
          key={query}
          className="rounded-md border bg-muted px-2 py-1 font-mono text-label text-foreground-secondary"
        >
          {query}
        </li>
      ))}
    </ul>
  );
}
