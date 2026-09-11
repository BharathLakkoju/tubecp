interface Props {
  queries: string[];
}

export default function ExpandedQueriesPanel({ queries }: Props) {
  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-[13px] font-semibold text-text">Expanded search queries</h3>
        <span className="shrink-0 font-mono text-xs text-text-muted">{queries.length}</span>
      </div>

      <div className="max-h-48 overflow-y-auto border border-border bg-surface">
        <ol className="list-none">
          {queries.map((query, i) => (
            <li
              key={`${i}-${query}`}
              className="border-b border-border px-4 py-2.5 font-mono text-[13px] leading-snug text-text last:border-b-0"
            >
              <span className="mr-2 text-text-muted">{String(i + 1).padStart(2, "0")}</span>
              {query}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
