"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CopyButton from "@/components/CopyButton";

export default function McpHostedPanel() {
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/mcp-keys")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.endpoint) {
          setEndpoint(data.endpoint);
        }
      })
      .catch(() => setError("Failed to load MCP endpoint"));
  }, []);

  return (
    <div className="border border-border bg-surface p-5">
      <h3 className="font-mono text-sm font-semibold text-text">Hosted MCP</h3>
      <p className="mt-2 font-mono text-[13px] text-text-muted">
        Connect Claude, Cursor, or ChatGPT with OAuth — sign in with your TubeCP account when the
        client asks.{" "}
        <Link href="/docs/mcp" className="text-accent">
          Full setup guide →
        </Link>
      </p>

      <div className="mt-4">
        <p className="mb-1 font-mono text-[12px] font-semibold text-text">MCP server URL</p>
        <p className="mb-2 font-mono text-[11px] text-text-muted">
          Paste this into your client&apos;s connector URL field.
        </p>
        {endpoint ? (
          <div className="copy-field">
            <code className="copy-field-value">{endpoint}</code>
            <CopyButton variant="icon" text={endpoint} label="Copy MCP URL" />
          </div>
        ) : (
          <p className="font-mono text-[12px] text-text-muted">Loading endpoint…</p>
        )}
      </div>

      <div className="mt-4 border border-border bg-bg p-4">
        <p className="font-mono text-[12px] font-semibold text-text">Claude / ChatGPT / Cursor</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 font-mono text-[12px] leading-relaxed text-text-muted">
          <li>Add a custom connector with the MCP server URL above.</li>
          <li>When asked how to authenticate, choose <strong className="text-text">Sign in now</strong>.</li>
          <li>Complete the TubeCP sign-in flow in your browser.</li>
          <li>Enable the connector in chat and ask it to use TubeCP tools.</li>
        </ol>
      </div>

      <div className="mt-4 border border-border bg-bg p-4">
        <p className="font-mono text-[12px] font-semibold text-text">Claude Code or Cursor (CLI)</p>
        <div className="copy-field mt-2">
          <pre className="copy-field-value overflow-x-auto p-3 text-[11px] text-text">
{`claude mcp add tubecp --transport http ${endpoint ?? "https://tubecp.vercel.app/api/mcp"}`}
          </pre>
          <CopyButton
            variant="icon"
            text={`claude mcp add tubecp --transport http ${endpoint ?? "https://tubecp.vercel.app/api/mcp"}`}
            label="Copy CLI command"
            className="copy-field-action-top"
          />
        </div>
        <p className="mt-2 font-mono text-[11px] text-text-muted">
          The CLI completes OAuth automatically after you add the server.
        </p>
      </div>

      {error && <p className="mt-3 font-mono text-[13px] text-accent">{error}</p>}
    </div>
  );
}
