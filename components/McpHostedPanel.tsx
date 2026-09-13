"use client";

import Link from "next/link";
import { useState } from "react";

export default function McpHostedPanel() {
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createKey = async () => {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/user/mcp-keys", { method: "POST" });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create MCP key");
      return;
    }

    setCreatedKey(data.key);
    setEndpoint(data.endpoint);
  };

  return (
    <div className="border border-border bg-surface p-5">
      <h3 className="font-mono text-sm font-semibold text-text">Hosted MCP</h3>
      <p className="mt-2 font-mono text-[13px] text-text-muted">
        Connect Claude, Cursor, or ChatGPT to TubeCP over HTTPS — no local server required.{" "}
        <Link href="/docs/mcp" className="text-accent">
          Full setup guide →
        </Link>
      </p>

      <div className="mt-4 border border-border bg-bg p-4">
        <p className="font-mono text-[12px] font-semibold text-text">URL vs API key</p>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-text-muted">
          You get <strong className="text-text">two values</strong>. They go in different places in
          your MCP client:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-[12px] text-text-muted">
          <li>
            <strong className="text-text">MCP server URL</strong> → the endpoint below (e.g. Claude&apos;s
            &quot;MCP server URL&quot; field)
          </li>
          <li>
            <strong className="text-text">API key</strong> (<code>tcp_…</code>) →{" "}
            <code>Authorization: Bearer tcp_…</code> header — not the URL field
          </li>
        </ul>
      </div>

      <button type="button" className="btn-primary mt-4" onClick={createKey} disabled={creating}>
        {creating ? "creating key…" : "generate MCP API key"}
      </button>

      {createdKey && endpoint && (
        <div className="mt-4 space-y-4 font-mono text-[12px] text-text-muted">
          <p className="border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-text">
            Save both values now — the API key is shown only once.
          </p>

          <div>
            <p className="mb-1 font-semibold text-text">1. MCP server URL</p>
            <p className="text-[11px]">Paste into your client&apos;s &quot;MCP server URL&quot; field.</p>
            <code className="mt-1 block break-all border border-border bg-bg p-2 text-text">{endpoint}</code>
          </div>

          <div>
            <p className="mb-1 font-semibold text-text">2. API key (Authorization header)</p>
            <p className="text-[11px]">
              In Claude: Continue → Request headers → <code>Authorization</code> →{" "}
              <code>Bearer {createdKey}</code>
            </p>
            <code className="mt-1 block break-all border border-border bg-bg p-2 text-text">
              Bearer {createdKey}
            </code>
          </div>

          <div>
            <p className="mb-1 font-semibold text-text">Cursor / Claude Desktop config</p>
            <pre className="overflow-x-auto border border-border bg-bg p-3 text-[11px] text-text">
{`{
  "mcpServers": {
    "tubecp-hosted": {
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer ${createdKey}"
      }
    }
  }
}`}
            </pre>
          </div>

          <p className="text-[11px]">
            Step-by-step for Claude web, Cursor, and ChatGPT:{" "}
            <Link href="/docs/mcp" className="text-accent">
              /docs/mcp
            </Link>
          </p>
        </div>
      )}

      {error && <p className="mt-3 font-mono text-[13px] text-accent">{error}</p>}
    </div>
  );
}
