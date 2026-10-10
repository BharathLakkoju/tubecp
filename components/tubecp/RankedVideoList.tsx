"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemGroup, ItemSeparator } from "@/components/ui/item";
import VideoResultRow, { type VideoRowData } from "@/components/tubecp/VideoResultRow";
import { MOTION } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  /** Mono caption next to the title, e.g. "Sorted by relevance". */
  caption?: string;
  videos: VideoRowData[];
  scores?: Record<string, number>;
  emptyMessage?: string;
  numbered?: boolean;
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggle?: (videoId: string, selected: boolean) => void;
  /** Rows shown before "Show N more". */
  pageSize?: number;
  /** Cap the list height and scroll inside (live research panels). */
  maxHeightClass?: string;
  copyable?: boolean;
  className?: string;
}

/**
 * Ranked video list (design system §6.4): one Card with ItemGroup + separators.
 * First paint staggers only the first 8 rows (M11); later rows insert without delay.
 */
export default function RankedVideoList({
  title,
  caption,
  videos,
  scores,
  emptyMessage = "No videos found.",
  numbered = false,
  selectable = false,
  selectedIds,
  onToggle,
  pageSize = 20,
  maxHeightClass,
  copyable = false,
  className,
}: Props) {
  const [visible, setVisible] = useState(() => Math.min(pageSize, videos.length));

  useEffect(() => {
    setVisible((count) => Math.min(Math.max(count, pageSize), videos.length));
  }, [videos.length, pageSize]);

  const shown = videos.slice(0, visible);
  const remaining = videos.length - visible;

  return (
    <section className={cn("flex min-h-0 flex-col gap-3", className)} aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-title-sm text-foreground">{title}</h3>
        <p className="text-caption text-muted-foreground">
          <span className="font-mono tabular-nums">{videos.length}</span>
          {caption ? ` · ${caption}` : ""}
        </p>
      </div>

      <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-none">
        {videos.length === 0 ? (
          <p className="px-4 py-8 text-center text-body-sm text-foreground-secondary">
            {emptyMessage}
          </p>
        ) : (
          <div className={cn(maxHeightClass && "overflow-y-auto", maxHeightClass)}>
            <ItemGroup className="gap-0">
              <AnimatePresence initial={false}>
                {shown.map((video, index) => (
                  <m.div
                    key={video.videoId}
                    initial={{ opacity: 0, y: MOTION.distance.app }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: MOTION.duration.base,
                        ease: MOTION.ease,
                        delay: Math.min(index, MOTION.staggerCap) * MOTION.stagger.app,
                      },
                    }}
                    exit={{ opacity: 0, transition: { duration: MOTION.duration.fast } }}
                  >
                    {index > 0 && <ItemSeparator className="my-0" />}
                    <VideoResultRow
                      video={video}
                      rank={numbered ? index + 1 : undefined}
                      score={scores?.[video.videoId]}
                      selectable={selectable}
                      selected={selectedIds?.has(video.videoId) ?? false}
                      onSelectedChange={(selected) => onToggle?.(video.videoId, selected)}
                      copyable={copyable}
                    />
                  </m.div>
                ))}
              </AnimatePresence>
            </ItemGroup>
          </div>
        )}
      </Card>

      {remaining > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setVisible((count) => Math.min(count + pageSize, videos.length))}
        >
          {remaining <= pageSize
            ? `Show all ${videos.length}`
            : `Show ${Math.min(remaining, pageSize)} more`}
        </Button>
      )}
    </section>
  );
}
