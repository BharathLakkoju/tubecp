"use client";

import { useEffect, useState } from "react";
import StatTile from "@/components/tubecp/StatTile";
import { FormAlert } from "@/components/tubecp/FormKit";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminUsagePayload = {
  summary: {
    date: string;
    totals: {
      openrouterChatTokens: number;
      openrouterEmbeddingInputs: number;
      youtubeQuotaUnits: number;
    };
    users: Array<{
      userId: string;
      openrouterChatTokens: number;
      openrouterEmbeddingInputs: number;
      youtubeQuotaUnits: number;
    }>;
  };
  youtubeQuota: {
    used: number;
    limit: number;
    warning: boolean;
  };
};

export default function AdminUsageDashboard() {
  const [data, setData] = useState<AdminUsagePayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/usage")
      .then((res) => res.json())
      .then((json) => {
        if (!json.summary) {
          throw new Error(json.error ?? "Failed to load admin usage");
        }
        setData(json as AdminUsagePayload);
      })
      .catch((err) => setError(String(err).replace(/^Error: /, "")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading operator usage">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <FormAlert kind="error">{error}</FormAlert>;
  }

  if (!data) return null;

  const { summary, youtubeQuota } = data;
  const quotaPct = youtubeQuota.limit > 0 ? Math.round((youtubeQuota.used / youtubeQuota.limit) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="platform-totals" className="flex flex-col gap-3">
        <h2 id="platform-totals" className="text-title text-foreground">
          Platform totals <span className="font-mono text-body-sm text-foreground-secondary">({summary.date})</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="OpenRouter chat tokens" value={summary.totals.openrouterChatTokens.toLocaleString()} />
          <StatTile label="Embedding inputs" value={summary.totals.openrouterEmbeddingInputs.toLocaleString()} />
          <StatTile label="YouTube units (users)" value={summary.totals.youtubeQuotaUnits.toLocaleString()} />
          <StatTile
            label="YouTube quota (global)"
            value={`${youtubeQuota.used.toLocaleString()} / ${youtubeQuota.limit.toLocaleString()}`}
            hint={youtubeQuota.warning ? "Warning: near the daily limit" : undefined}
            progress={quotaPct}
            thresholds
          />
        </div>
      </section>

      <section aria-labelledby="per-user" className="flex flex-col gap-3">
        <h2 id="per-user" className="text-title text-foreground">
          Per-user usage
        </h2>
        {summary.users.length === 0 ? (
          <p className="text-body text-foreground-secondary">No usage recorded for this date.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Chat tokens</TableHead>
                  <TableHead className="text-right">Embeddings</TableHead>
                  <TableHead className="text-right">YouTube units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.users.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="font-mono text-label">{row.userId}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.openrouterChatTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.openrouterEmbeddingInputs.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.youtubeQuotaUnits.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
