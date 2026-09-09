interface Props {
  used: number;
  limit: number;
  label?: string;
}

export default function UsageIndicator({ used, limit, label = "used" }: Props) {
  const segments = Math.min(limit, 10);
  const filled = limit > 0 ? Math.round((used / limit) * segments) : 0;

  return (
    <div className="mb-6 flex items-center gap-3 border-y border-border py-3">
      <span className="shrink-0 font-mono text-xs whitespace-nowrap text-text-muted">
        {used} / {limit} {label}
      </span>
      <div className="flex flex-1 gap-0.5" aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={
              i < filled
                ? "size-2 border border-accent bg-accent transition-[background-color,border-color] duration-200 ease-out"
                : "size-2 border border-border bg-surface transition-[background-color,border-color] duration-200 ease-out"
            }
          />
        ))}
      </div>
    </div>
  );
}
