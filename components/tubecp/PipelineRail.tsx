import { CheckCircle, Pause, XCircle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export type PipelineStepState = "pending" | "active" | "done" | "failed" | "stalled";

export interface PipelineStep {
  id: string;
  label: string;
  state: PipelineStepState;
  /** Mono count, e.g. "12/20". */
  count?: string;
}

const STATE_LABEL: Record<PipelineStepState, string> = {
  pending: "pending",
  active: "in progress",
  done: "complete",
  failed: "failed",
  stalled: "stalled",
};

/**
 * Pipeline rail (signature piece, design system §6.7): one stepper for research
 * (Expand, Search, Analyze, Rank) and KB build (Queued, Transcripts, Chunk, Embed, Index, Ready).
 * Status is conveyed with an icon plus text, never color alone. The active pulse stops when stalled.
 */
export default function PipelineRail({
  steps,
  label,
  className,
}: {
  steps: PipelineStep[];
  label: string;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={cn("flex flex-wrap items-center gap-x-2 gap-y-2", className)}>
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-center gap-2" aria-current={step.state === "active" ? "step" : undefined}>
          <span className="relative flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
            {step.state === "done" && <CheckCircle weight="fill" className="size-5 text-success" />}
            {step.state === "failed" && <XCircle weight="fill" className="size-5 text-destructive" />}
            {step.state === "stalled" && <Pause weight="fill" className="size-5 text-warning" />}
            {step.state === "active" && (
              <>
                <span className="absolute size-3 animate-pulse-ring rounded-full bg-primary/40" />
                <span className="relative size-3 rounded-full bg-primary ring-2 ring-primary-subtle" />
              </>
            )}
            {step.state === "pending" && <span className="size-3 rounded-full border-2 border-input" />}
          </span>
          <span
            className={cn(
              "text-label",
              step.state === "pending" ? "text-muted-foreground" : "text-foreground",
              step.state === "active" && "font-semibold"
            )}
          >
            {step.label}
            {step.count && (
              <span className="ml-1.5 font-mono tabular-nums text-foreground-secondary">{step.count}</span>
            )}
            <span className="sr-only"> ({STATE_LABEL[step.state]})</span>
          </span>
          {index < steps.length - 1 && (
            <span aria-hidden="true" className="mx-1 h-px w-4 bg-border max-sm:hidden" />
          )}
        </li>
      ))}
    </ol>
  );
}
