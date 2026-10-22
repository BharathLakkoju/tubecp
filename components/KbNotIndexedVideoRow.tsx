"use client";

import CopyButton from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { RankedVideo } from "@/lib/types";
import { displaySkipReason, youtubeWatchUrl } from "@/lib/client/kb-source-videos";
import { cn } from "@/lib/utils";
import { ArrowSquareOut } from "@phosphor-icons/react";

export interface KbNotIndexedVideoRowProps {
  video: RankedVideo;
  reason?: string;
  skipped: boolean;
  className?: string;
}

export default function KbNotIndexedVideoRow({
  video,
  reason,
  skipped,
  className,
}: KbNotIndexedVideoRowProps) {
  const watchUrl = youtubeWatchUrl(video);
  const reasonText = reason ? displaySkipReason(reason, video.title) : undefined;

  return (
    <article
      className={cn(
        "grid grid-cols-1 gap-4 border-b border-border px-4 py-4 last:border-b-0 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-start",
        className
      )}
    >
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-md border border-border bg-muted sm:row-span-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnailUrl}
          alt=""
          width={120}
          height={68}
          loading="lazy"
          className="aspect-video w-full object-cover sm:w-[7.5rem]"
        />
      </a>

      <div className="min-w-0 space-y-2 sm:col-start-2">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <h3 className="min-w-0 flex-1 text-body font-medium leading-snug text-foreground">
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline underline-offset-2"
            >
              {video.title}
            </a>
          </h3>
          <Badge variant={skipped ? "destructive" : "secondary"} className="shrink-0">
            {skipped ? "Skipped" : "Not indexed"}
          </Badge>
        </div>
        {video.channel ? (
          <p className="truncate text-caption text-muted-foreground">{video.channel}</p>
        ) : null}
        {reasonText ? (
          <p className="text-body-sm leading-relaxed text-foreground-secondary">{reasonText}</p>
        ) : null}
      </div>

      <div className="flex flex-row items-center gap-2 sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-stretch">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm", className: "w-full sm:min-w-[5.5rem]" })}
        >
          Open
          <ArrowSquareOut data-icon="inline-end" aria-hidden />
          <span className="sr-only">{video.title} on YouTube</span>
        </a>
        <CopyButton text={watchUrl} label="Copy YouTube link" className="w-full" />
      </div>
    </article>
  );
}
