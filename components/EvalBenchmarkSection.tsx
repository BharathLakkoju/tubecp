"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EvalBenchmarkSnapshot } from "@/lib/eval/benchmark";

export default function EvalBenchmarkSection() {
  const [benchmark, setBenchmark] = useState<EvalBenchmarkSnapshot | null>(null);

  useEffect(() => {
    fetch("/api/eval/benchmark")
      .then((res) => res.json())
      .then((data) => setBenchmark(data))
      .catch(() => setBenchmark(null));
  }, []);

  if (!benchmark) return null;

  return (
    <section className="pt-10">
      <h2 className="section-title">Benchmarked research quality</h2>
      <p className="section-desc">
        We score ranking quality on {benchmark.topicsTotal} curated topics — technical, business,
        and general-interest queries with human-reviewed relevance thresholds.
      </p>

      <div className="mt-6 grid gap-4 border border-border bg-surface p-5 md:grid-cols-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Pass rate</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-text">{benchmark.passRate}%</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Topics</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-text">
            {benchmark.topicsPassed}/{benchmark.topicsTotal}
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Updated</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-text">{benchmark.updatedAt}</p>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-border border border-border">
        {benchmark.topics.slice(0, 5).map((topic) => (
          <li key={topic.id} className="flex items-start justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-mono text-sm font-semibold text-text">{topic.topic}</p>
              <p className="mt-1 font-mono text-[12px] text-text-muted">{topic.notes}</p>
            </div>
            <span className="shrink-0 font-mono text-xs text-success">
              {topic.passed ? "pass" : "fail"}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 font-mono text-xs text-text-muted">
        Reproduce locally with <code>npm run eval</code>.{" "}
        <Link href="/api/eval/benchmark" className="text-text-muted underline">
          View full benchmark JSON
        </Link>
      </p>
    </section>
  );
}
