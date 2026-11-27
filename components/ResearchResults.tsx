"use client";

import { CaretRight } from "@phosphor-icons/react";
import CopyButton from "@/components/CopyButton";
import RankedVideoList from "@/components/tubecp/RankedVideoList";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { RankedVideo, ResearchResult } from "@/lib/types";
import { videoUrlsAsLines } from "@/lib/video-urls";

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
  const scores = research.speechSelection
    ? undefined
    : Object.fromEntries(ranked.map((video) => [video.videoId, video.relevanceScore]));
  const shown = research.speechSelection
    ? ranked.map(({ relevanceScore: _score, ...video }) => video)
    : ranked;
  const analyzedLinksText = videoUrlsAsLines(ranked);
  const searchedLinksText = videoUrlsAsLines(research.allVideos);

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
        {(ranked.length > 0 || research.allVideos.length > 0) && (
          <div className="flex flex-wrap justify-end gap-2" role="group" aria-label="Copy video links">
            {ranked.length > 0 && (
              <CopyButton text={analyzedLinksText} label="Copy analyzed links" />
            )}
            {research.allVideos.length > 0 && (
              <CopyButton text={searchedLinksText} label="Copy searched links" />
            )}
          </div>
        )}
        <RankedVideoList
          title={research.speechSelection ? "Discuss the topic" : "Best matches"}
          caption={
            research.speechSelection
              ? `${ranked.length} selected from ${research.allVideos.length} found · transcript`
              : `${ranked.length} relevant of ${research.allVideos.length} found · sorted by relevance`
          }
          videos={shown}
          scores={scores}
          numbered
          selectable={selectable}
          selectedIds={selectedIds}
          onToggle={onToggle}
          pageSize={10}
          copyable
          emptyMessage={
            research.speechSelection
              ? "No transcript discussed this topic. Unread videos can be tried again."
              : "No videos met the relevance threshold for this topic. Try a broader topic."
          }
        />
      </div>

      {research.speechSelection && (
        <SpeechGroups research={research} />
      )}

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
                copyable
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

const UNREAD_COPY: Record<string, string> = {
  no_captions: "No captions. The next search tries again tomorrow.",
  captions_failed: "Captions failed. The next search tries again.",
  model_failed: "The transcript was not judged. The next search tries again.",
};

const SKIP_COPY: Record<string, string> = {
  over_search_cap: "Past the search cap. A higher plan can read further.",
  over_analyze_cap: "Past the analyze cap. A higher plan can read further.",
};

function SpeechGroups({ research }: { research: ResearchResult }) {
  const rejected = research.rejected ?? [];
  const unread = research.unread ?? [];
  const skipped = research.skipped ?? [];
  if (rejected.length + unread.length + skipped.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 text-body-sm text-foreground-secondary">
      {unread.length > 0 && (
        <p>
          {unread.length} not read. {unread.map((item) => UNREAD_COPY[item.reason]).filter(Boolean)[0]}
        </p>
      )}
      {skipped.length > 0 && (
        <p>
          {skipped.length} not attempted. {SKIP_COPY[skipped[0].reason]}
        </p>
      )}
      {rejected.length > 0 && (
        <p>
          {rejected.length} read and not about this topic.
        </p>
      )}
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
