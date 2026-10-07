"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import StatTile from "@/components/tubecp/StatTile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EvalBenchmarkSnapshot } from "@/lib/eval/benchmark";

function isEvalBenchmarkSnapshot(data: unknown): data is EvalBenchmarkSnapshot {
  if (!data || typeof data !== "object") return false;
  const snapshot = data as EvalBenchmarkSnapshot;
  return Array.isArray(snapshot.topics) && snapshot.topics.length > 0;
}

export default function EvalBenchmarkSection() {
  const [benchmark, setBenchmark] = useState<EvalBenchmarkSnapshot | null>(null);

  useEffect(() => {
    fetch("/api/eval/benchmark")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setBenchmark(isEvalBenchmarkSnapshot(data) ? data : null))
      .catch(() => setBenchmark(null));
  }, []);

  const topics = benchmark?.topics ?? [];
  if (!benchmark || topics.length === 0) return null;

  return (
    <section aria-labelledby="benchmark-heading" className="flex flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 id="benchmark-heading" className="text-headline text-foreground">
          Benchmarked research quality
        </h2>
        <p className="text-body text-foreground-secondary">
          We score ranking quality on {benchmark.topicsTotal} curated topics: technical, business,
          and general-interest queries with human-reviewed relevance thresholds.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Pass rate" value={`${benchmark.passRate}%`} />
        <StatTile label="Topics" value={`${benchmark.topicsPassed}/${benchmark.topicsTotal}`} />
        <StatTile label="Updated" value={benchmark.updatedAt} />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.slice(0, 5).map((topic) => (
              <TableRow key={topic.id}>
                <TableCell className="font-medium text-foreground">{topic.topic}</TableCell>
                <TableCell className="whitespace-normal text-foreground-secondary">{topic.notes}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      topic.passed
                        ? "inline-flex items-center gap-1 text-label text-success"
                        : "inline-flex items-center gap-1 text-label text-destructive"
                    }
                  >
                    {topic.passed ? (
                      <CheckCircle weight="fill" aria-hidden />
                    ) : (
                      <XCircle weight="fill" aria-hidden />
                    )}
                    {topic.passed ? "Pass" : "Fail"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-label text-foreground-secondary">
        Reproduce locally with <code className="font-mono">npm run eval</code>.{" "}
        <Link href="/api/eval/benchmark" className="underline underline-offset-2">
          View full benchmark JSON
        </Link>
      </p>
    </section>
  );
}
