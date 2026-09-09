interface Props {
  message: string;
  progress: number;
}

const SEGMENTS = 10;

export default function ProgressBar({ message, progress }: Props) {
  const filled = Math.round((progress / 100) * SEGMENTS);

  return (
    <div className="mb-6 border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 max-sm:flex-col max-sm:items-start max-sm:gap-1">
        <span className="font-mono text-[13px] text-text-muted">{message}</span>
        {progress > 0 && <span className="font-mono text-xs text-accent">{progress}%</span>}
      </div>
      <div className="flex gap-0.5 p-3" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <div
            key={i}
            className={
              i < filled
                ? "h-2 min-w-2 flex-1 bg-accent transition-[background-color] duration-200 ease-out"
                : "h-2 min-w-2 flex-1 border border-border bg-surface transition-[background-color] duration-200 ease-out"
            }
          />
        ))}
      </div>
    </div>
  );
}
