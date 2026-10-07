"use client";

import { useEffect, useState } from "react";
import { Pause, WarningCircle } from "@phosphor-icons/react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import PipelineRail, { type PipelineStep } from "@/components/tubecp/PipelineRail";

interface Props {
  title: string;
  /** Names the rail for assistive tech, e.g. "Research progress". */
  railLabel: string;
  steps: PipelineStep[];
  /** 0-100. */
  progress: number;
  /** Progress label and aria-valuetext, e.g. "7 of 20 videos". */
  progressText: string;
  /** What the machine is doing right now (shimmer line). */
  current?: string;
  /** Epoch ms when the job started; shows a mono elapsed timer. */
  startedAt?: number;
  /** No progress for 45s+: show the warning alert and stop the pulse. */
  stalled?: boolean;
  /** Plain-language failure. Replaces the progress block. */
  error?: string;
  retryLabel?: string;
  onRetry?: () => void;
  onKeepWaiting?: () => void;
  onCancel?: () => void;
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Job status (design system §6.7): a long job always shows the step, counts, elapsed time,
 * and a way out. The polite live region announces step changes only, not every tick.
 */
export default function JobStatus({
  title,
  railLabel,
  steps,
  progress,
  progressText,
  current,
  startedAt,
  stalled = false,
  error,
  retryLabel = "Retry",
  onRetry,
  onKeepWaiting,
  onCancel,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const activeLabel = steps.find((step) => step.state === "active")?.label ?? "";
  const running = !error;

  useEffect(() => {
    if (!startedAt || !running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, running]);

  const railSteps = steps.map((step) => {
    if (error && step.state === "active") return { ...step, state: "failed" as const };
    if (stalled && step.state === "active") return { ...step, state: "stalled" as const };
    return step;
  });

  return (
    <Card size="sm" className="rounded-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {onCancel && running && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PipelineRail steps={railSteps} label={railLabel} />

        {error ? (
          <Alert variant="destructive">
            <WarningCircle weight="fill" aria-hidden />
            <AlertTitle>{title} failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            {onRetry && (
              <AlertAction>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  {retryLabel}
                </Button>
              </AlertAction>
            )}
          </Alert>
        ) : (
          <>
            <Progress
              value={progress}
              getAriaValueText={() => progressText}
              className="gap-2"
            >
              <ProgressLabel>{progressText}</ProgressLabel>
              <ProgressValue>
                {(_formatted: string | null, value: number | null) => `${Math.round(value ?? 0)}%`}
              </ProgressValue>
            </Progress>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              {current && (
                <Marker aria-live="off" className="min-w-0 flex-1 text-body-sm">
                  <MarkerIcon>{!stalled && <Spinner />}</MarkerIcon>
                  <MarkerContent className={stalled ? "" : "shimmer"}>{current}</MarkerContent>
                </Marker>
              )}
              {startedAt && (
                <span className="font-mono text-label tabular-nums text-foreground-secondary">
                  {formatElapsed(now - startedAt)} elapsed
                </span>
              )}
            </div>

            {stalled && (
              <Alert variant="warning">
                <Pause weight="fill" aria-hidden />
                <AlertTitle>No progress for 1 min</AlertTitle>
                <AlertDescription>
                  The job is still running, but nothing has changed. You can keep waiting or retry.
                </AlertDescription>
                <AlertAction>
                  {onKeepWaiting && (
                    <Button variant="outline" size="sm" onClick={onKeepWaiting}>
                      Keep waiting
                    </Button>
                  )}
                  {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      {retryLabel}
                    </Button>
                  )}
                </AlertAction>
              </Alert>
            )}
          </>
        )}

        <span className="sr-only" role="status" aria-live="polite">
          {error ? "" : activeLabel ? `${activeLabel} in progress` : ""}
        </span>
      </CardContent>
    </Card>
  );
}
