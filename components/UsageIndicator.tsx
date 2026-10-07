"use client";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  used: number;
  limit: number;
  label?: string;
  className?: string;
}

/**
 * Usage meter (design system §6.17, §8.7): mono counts, bar turns warning at 80% and
 * destructive at 100%. The numbers carry the meaning; color is only a reinforcement.
 */
export default function UsageIndicator({ used, limit, label = "used", className }: Props) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone =
    pct >= 100
      ? "[&_[data-slot=progress-indicator]]:bg-destructive"
      : pct >= 80
        ? "[&_[data-slot=progress-indicator]]:bg-warning"
        : "";

  return (
    <Progress
      value={pct}
      getAriaValueText={() => `${used} of ${limit} ${label}`}
      className={cn("w-full gap-2", tone, className)}
    >
      <ProgressLabel className="font-mono tabular-nums text-foreground-secondary">
        {used} / {limit} {label}
      </ProgressLabel>
      <ProgressValue className="sr-only">
        {(_formatted: string | null, value: number | null) => `${Math.round(value ?? 0)}%`}
      </ProgressValue>
    </Progress>
  );
}
