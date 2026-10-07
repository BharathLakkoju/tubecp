"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import RelevanceMeter from "@/components/tubecp/RelevanceMeter";
import type { RankedVideo, VideoSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export type VideoRowData = VideoSummary &
  Partial<Pick<RankedVideo, "relevanceScore" | "whyRelevant" | "discussionLevel">>;

interface Props {
  video: VideoRowData;
  /** 1-based rank, shown as a mono index. */
  rank?: number;
  /** Relevance override (live analysis scores). */
  score?: number;
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  className?: string;
}

/**
 * Video result row (design system §6.3). The checkbox selects; "Open" is a separate link so the
 * row never becomes an external link (v1 bug). Thumbnails are decorative (`alt=""`): the title is adjacent.
 */
export default function VideoResultRow({
  video,
  rank,
  score,
  selectable = false,
  selected = false,
  onSelectedChange,
  className,
}: Props) {
  const relevance = score ?? video.relevanceScore;
  const excluded = selectable && !selected;

  return (
    <Item
      variant="default"
      data-selected={selectable ? selected : undefined}
      className={cn(
        "relative rounded-none px-4 py-3 max-sm:flex-col max-sm:items-start",
        "data-[selected=true]:bg-primary-subtle",
        "data-[selected=true]:before:absolute data-[selected=true]:before:inset-y-0 data-[selected=true]:before:left-0 data-[selected=true]:before:w-0.5 data-[selected=true]:before:bg-primary data-[selected=true]:before:content-['']",
        className
      )}
    >
      {rank !== undefined && (
        <span
          aria-hidden="true"
          className="w-6 shrink-0 font-mono text-label tabular-nums text-muted-foreground max-sm:hidden"
        >
          {String(rank).padStart(2, "0")}
        </span>
      )}
      <ItemMedia variant="image" className="h-[68px] w-[120px] shrink-0 max-sm:h-auto max-sm:w-full max-sm:aspect-video">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnailUrl} alt="" width={120} height={68} loading="lazy" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle
          className={cn("line-clamp-2 whitespace-normal", excluded && "text-muted-foreground")}
        >
          {video.title}
        </ItemTitle>
        <ItemDescription className="line-clamp-1">{video.channel}</ItemDescription>
        {video.whyRelevant && (
          <ItemDescription className="text-foreground-secondary">{video.whyRelevant}</ItemDescription>
        )}
      </ItemContent>
      <ItemActions className="shrink-0 gap-3 max-sm:w-full max-sm:flex-wrap">
        {video.discussionLevel && (
          <Badge variant="secondary">
            {video.discussionLevel === "substantial" ? "Substantial" : "Brief"}
          </Badge>
        )}
        {relevance !== undefined && <RelevanceMeter score={relevance} />}
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "link", size: "sm" })}
        >
          Open
          <ArrowSquareOut data-icon="inline-end" aria-hidden />
          <span className="sr-only">{video.title} on YouTube (opens in a new tab)</span>
        </a>
        {selectable && (
          <Checkbox
            aria-label={`Include ${video.title}`}
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange?.(Boolean(checked))}
          />
        )}
      </ItemActions>
    </Item>
  );
}