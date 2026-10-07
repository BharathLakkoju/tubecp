"use client";

import { Play } from "@phosphor-icons/react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { ChatSource } from "@/lib/types";
import { cn } from "@/lib/utils";

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Deep link to the exact second. Server URLs may already carry a `t` param. */
export function timestampUrl(source: ChatSource): string {
  try {
    const url = new URL(source.url);
    url.searchParams.set("t", `${Math.floor(source.timestamp)}s`);
    return url.toString();
  } catch {
    return source.url;
  }
}

/**
 * Evidence chip (signature piece, design system §6.12): `[▶ 12:34]` deep-links to the exact
 * timestamp and previews the excerpt on hover or focus. The link works without the preview, and
 * the same excerpt is in the SourceList for touch and keyboard users.
 */
export default function EvidenceChip({
  source,
  className,
}: {
  source: ChatSource;
  className?: string;
}) {
  const time = formatTimestamp(source.timestamp);

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <a
            href={timestampUrl(source)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex max-w-full items-center gap-1 rounded-xs bg-muted px-1.5 py-0.5 font-mono text-caption tabular-nums text-primary no-underline transition-colors duration-(--duration-fast) hover:bg-accent",
              className
            )}
          />
        }
      >
        <Play weight="fill" className="size-2.5 shrink-0" aria-hidden />
        <span>{time}</span>
        <span className="truncate font-sans text-foreground-secondary">{source.title}</span>
        <span className="sr-only"> (opens YouTube at {time})</span>
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="line-clamp-2 text-label font-semibold text-foreground">{source.title}</p>
        <p className="mt-1 font-mono text-caption tabular-nums text-primary">{time}</p>
        {source.excerpt && (
          <p className="mt-2 line-clamp-5 text-body-sm text-foreground-secondary">
            &ldquo;{source.excerpt}&rdquo;
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
