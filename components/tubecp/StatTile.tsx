import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: React.ReactNode;
  /** Mono caption under the value (e.g. "of 30"). */
  hint?: React.ReactNode;
  /** 0-100. Adds a Progress bar. */
  progress?: number;
  /** Turns the bar warning at 80% and danger at 100% (design system §8.7). */
  thresholds?: boolean;
  className?: string;
}

/** Bento stat tile (design system §6.17). Numbers are mono + tabular. */
export default function StatTile({ label, value, hint, progress, thresholds, className }: Props) {
  const tone =
    thresholds && progress !== undefined
      ? progress >= 100
        ? "[&_[data-slot=progress-indicator]]:bg-destructive"
        : progress >= 80
          ? "[&_[data-slot=progress-indicator]]:bg-warning"
          : ""
      : "";

  return (
    <Card size="sm" className={cn("rounded-xl", className)}>
      <CardHeader>
        <CardDescription className="text-caption font-medium uppercase tracking-[0.04em]">
          {label}
        </CardDescription>
        <CardTitle className="font-mono text-title tabular-nums">{value}</CardTitle>
        {hint && <p className="text-caption text-foreground-secondary">{hint}</p>}
      </CardHeader>
      {progress !== undefined && (
        <div className={cn("px-(--card-spacing)", tone)}>
          <Progress value={Math.min(100, Math.max(0, progress))} aria-label={label} />
        </div>
      )}
    </Card>
  );
}
