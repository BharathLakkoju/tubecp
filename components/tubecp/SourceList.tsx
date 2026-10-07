"use client";

import { CaretDown } from "@phosphor-icons/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle } from "@/components/ui/item";
import EvidenceChip, { formatTimestamp, timestampUrl } from "@/components/tubecp/EvidenceChip";
import type { ChatSource } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Source list (design system §6.12): a Collapsible of Items, open on the latest answer.
 * Every source shows title, timestamp and excerpt, so keyboard and touch users never depend on hover.
 */
export default function SourceList({
  sources,
  defaultOpen = false,
  className,
}: {
  sources: ChatSource[];
  defaultOpen?: boolean;
  className?: string;
}) {
  if (sources.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-1.5" aria-label="Evidence">
        {sources.map((source, index) => (
          <EvidenceChip key={`${source.videoId}-${source.timestamp}-${index}`} source={source} />
        ))}
      </div>

      <Collapsible defaultOpen={defaultOpen} className="group/sources">
        <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-xs text-label text-foreground-secondary outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <CaretDown
            aria-hidden
            className="size-3.5 transition-transform duration-(--duration-fast) group-data-[open]/sources:rotate-180"
          />
          Sources <span className="font-mono tabular-nums">({sources.length})</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[ending-style]:h-0 data-[starting-style]:h-0 h-(--collapsible-panel-height) transition-[height] duration-(--duration-base) ease-out">
          <ItemGroup className="mt-2 gap-0 overflow-hidden rounded-lg border bg-card">
            {sources.map((source, index) => (
              <div key={`${source.videoId}-${source.timestamp}-${index}`}>
                {index > 0 && <ItemSeparator className="my-0" />}
                <Item size="sm" className="rounded-none">
                  <ItemContent>
                    <ItemTitle className="line-clamp-2 whitespace-normal">
                      <a
                        href={timestampUrl(source)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {source.title}
                      </a>
                      <span className="font-mono text-caption tabular-nums text-primary">
                        {formatTimestamp(source.timestamp)}
                      </span>
                    </ItemTitle>
                    {source.excerpt && <ItemDescription>{source.excerpt}</ItemDescription>}
                  </ItemContent>
                </Item>
              </div>
            ))}
          </ItemGroup>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
