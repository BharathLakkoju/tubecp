"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SEGMENTS = 5;

/**
 * Relevance meter (signature piece, design system §6.3): mono score + 5 segments.
 * Neutral below 40. Carries role="img" with an explicit label; the tooltip explains the score.
 */
export default function RelevanceMeter({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const filled = Math.round((clamped / 100) * SEGMENTS);
  const strong = clamped >= 40;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="img"
            aria-label={`Relevance ${clamped} of 100`}
            tabIndex={0}
            className={cn(
              "inline-flex items-center gap-2 rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
          />
        }
      >
        <span className="w-6 text-right font-mono text-label tabular-nums text-foreground">
          {clamped}
        </span>
        <span className="flex gap-0.5" aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-3 w-1.5 rounded-xs",
                i < filled ? (strong ? "bg-primary" : "bg-input") : "bg-muted"
              )}
            />
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Relevance blends the transcript match, semantic similarity, and how long the video discusses
        the topic.
      </TooltipContent>
    </Tooltip>
  );
}
