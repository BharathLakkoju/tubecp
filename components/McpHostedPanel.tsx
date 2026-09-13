"use client";

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
        Connect Cursor, Claude, or other MCP clients to TubeCP over HTTPS — no local stdio server required.
      </p>

      <button type="button" className="btn-primary mt-4" onClick={createKey} disabled={creating}>
        {creating ? "creating key…" : "generate MCP API key"}
      </button>

      {createdKey && (
        <div className="mt-4 space-y-3 font-mono text-[12px] text-text-muted">
          <p>
            Endpoint: <code className="text-text">{endpoint}</code>
          </p>
          <p>
            API key (shown once): <code className="break-all text-text">{createdKey}</code>
          </p>
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
      )}

      {error && <p className="mt-3 font-mono text-[13px] text-accent">{error}</p>}
    </div>
  );
}
