"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

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
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading operator usage..." />;
  }

  if (error) {
    return <p className="font-sans text-sm text-accent">{error}</p>;
  }

  if (!data) return null;

  const { summary, youtubeQuota } = data;

  return (
    <div className="space-y-8">
      <section className="auth-profile-section">
        <h2 className="auth-profile-title">Platform totals ({summary.date})</h2>
        <dl className="auth-profile-meta">
          <div>
            <dt>OpenRouter chat tokens</dt>
            <dd>{summary.totals.openrouterChatTokens.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Embedding inputs</dt>
            <dd>{summary.totals.openrouterEmbeddingInputs.toLocaleString()}</dd>
          </div>
          <div>
            <dt>YouTube quota units (users)</dt>
            <dd>{summary.totals.youtubeQuotaUnits.toLocaleString()}</dd>
          </div>
          <div>
            <dt>YouTube quota (global)</dt>
            <dd>
              {youtubeQuota.used.toLocaleString()} / {youtubeQuota.limit.toLocaleString()}
              {youtubeQuota.warning ? " — warning" : ""}
            </dd>
          </div>
        </dl>
      </section>

      <section className="auth-profile-section">
        <h2 className="auth-profile-title">Per-user usage</h2>
        {summary.users.length === 0 ? (
          <p className="font-mono text-[13px] text-text-muted">No usage recorded for this date.</p>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="markdown-table w-full min-w-[640px]">
              <thead className="markdown-table-head">
                <tr className="markdown-table-row">
                  <th className="markdown-table-cell markdown-table-header">User</th>
                  <th className="markdown-table-cell markdown-table-header">Chat tokens</th>
                  <th className="markdown-table-cell markdown-table-header">Embeddings</th>
                  <th className="markdown-table-cell markdown-table-header">YouTube units</th>
                </tr>
              </thead>
              <tbody className="markdown-table-body">
                {summary.users.map((row) => (
                  <tr key={row.userId} className="markdown-table-row">
                    <td className="markdown-table-cell font-mono text-xs">{row.userId}</td>
                    <td className="markdown-table-cell">{row.openrouterChatTokens}</td>
                    <td className="markdown-table-cell">{row.openrouterEmbeddingInputs}</td>
                    <td className="markdown-table-cell">{row.youtubeQuotaUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
