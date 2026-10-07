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

function BenchmarkResult({ passed }: { passed: boolean }) {
  return (
    <span
      className={
        passed
          ? "inline-flex shrink-0 items-center gap-1 text-label text-success"
          : "inline-flex shrink-0 items-center gap-1 text-label text-destructive"
      }
    >
      {passed ? <CheckCircle weight="fill" aria-hidden /> : <XCircle weight="fill" aria-hidden />}
      {passed ? "Pass" : "Fail"}
    </span>
  );
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
    <section aria-labelledby="benchmark-heading" className="flex flex-col gap-10">
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id="benchmark-heading" className="text-headline text-foreground">
          Benchmarked research quality
        </h2>
        <p className="text-body text-foreground-secondary">
          We score ranking quality on {benchmark.topicsTotal} curated topics: technical, business,
          and general-interest queries with human-reviewed relevance thresholds.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Pass rate" value={`${benchmark.passRate}%`} />
        <StatTile label="Topics" value={`${benchmark.topicsPassed}/${benchmark.topicsTotal}`} />
        <StatTile label="Updated" value={benchmark.updatedAt} />
      </div>

      <ul className="flex flex-col divide-y rounded-xl border bg-card sm:hidden">
        {topics.slice(0, 5).map((topic) => (
          <li key={topic.id} className="flex flex-col gap-3 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-body-sm font-medium text-foreground">{topic.topic}</p>
              <BenchmarkResult passed={topic.passed ?? false} />
            </div>
            {topic.notes ? (
              <p className="text-body-sm text-foreground-secondary">{topic.notes}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="hidden rounded-xl border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12 w-[38%] px-5 py-3">Topic</TableHead>
              <TableHead className="px-5 py-3">Notes</TableHead>
              <TableHead className="w-28 px-5 py-3 text-right">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.slice(0, 5).map((topic) => (
              <TableRow key={topic.id}>
                <TableCell className="px-5 py-4 align-top whitespace-normal font-medium text-foreground">
                  {topic.topic}
                </TableCell>
                <TableCell className="px-5 py-4 align-top whitespace-normal text-body-sm leading-relaxed text-foreground-secondary">
                  {topic.notes}
                </TableCell>
                <TableCell className="px-5 py-4 text-right align-top">
                  <BenchmarkResult passed={topic.passed ?? false} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="pt-2 text-body-sm break-words text-foreground-secondary">
        Reproduce locally with <code className="font-mono">npm run eval</code>.{" "}
        <Link href="/api/eval/benchmark" className="underline underline-offset-2">
          View full benchmark JSON
        </Link>
      </p>
    </section>
  );
}
