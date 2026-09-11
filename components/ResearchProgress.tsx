"use client";

import { useEllipsis } from "@/lib/hooks/useEllipsis";
import type { ResearchStage } from "@/lib/client/workflows";
import ProgressBar from "@/components/ProgressBar";

const STAGES: { id: ResearchStage; label: string }[] = [
  { id: "expanding", label: "expanding" },
  { id: "searching", label: "searching" },
  { id: "analyzing", label: "analyzing" },
  { id: "ranking", label: "ranking" },
];

interface Props {
  topic: string;
  stage: ResearchStage;
  detail?: string;
  progress: number;
}

function StageLabel({ label, active }: { label: string; active: boolean }) {
  const dots = useEllipsis();

  if (!active) return <span>{label}</span>;

  return (
    <span>
      {label}
      <span className="inline-block w-[1.5em] text-left" aria-hidden="true">{dots}</span>
    </span>
  );
}

export default function ResearchProgress({ topic, stage, detail, progress }: Props) {
  const stageIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="motion-fade-up">
      <div className="mb-8 border-b border-border pb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">researching</p>
        <h2 className="mt-2 font-mono text-base font-semibold break-words text-text">{topic}</h2>
      </div>

      <ProgressBar message={detail ?? STAGES[stageIndex]?.label ?? stage} progress={progress} />

      <ul className="border border-border bg-surface" aria-label="Research progress">
        {STAGES.map((s, i) => {
          const done = i < stageIndex;
          const active = i === stageIndex;
          const pending = i > stageIndex;

          return (
            <li
              key={s.id}
              className={`flex items-center gap-3 border-b border-border px-4 py-3 font-mono text-[13px] last:border-b-0 ${
                active ? "text-text" : done ? "text-success" : "text-text-muted"
              }`}
            >
              <span className="w-4 shrink-0 text-center" aria-hidden="true">
                {done ? "✓" : active ? "›" : "·"}
              </span>
              <StageLabel label={s.label} active={active} />
              {pending && <span className="sr-only">pending</span>}
              {done && <span className="sr-only">complete</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
