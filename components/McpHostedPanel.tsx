"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CopyField from "@/components/tubecp/CopyField";
import { FormAlert, SettingsSection } from "@/components/tubecp/FormKit";
import { Skeleton } from "@/components/ui/skeleton";

const FALLBACK_ENDPOINT = "https://tubecp.vercel.app/api/mcp";

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

  const cliCommand = `claude mcp add tubecp --transport http ${endpoint ?? FALLBACK_ENDPOINT}`;

  return (
    <SettingsSection
      title="Hosted MCP"
      description={
        <>
          Connect Claude, Cursor, or ChatGPT with OAuth. Sign in with your TubeCP account when the
          client asks.{" "}
          <Link href="/docs/mcp" className="text-primary underline underline-offset-2">
            Full setup guide
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-label font-medium text-foreground">MCP server URL</p>
        <p className="text-label text-foreground-secondary">
          Paste this into your client&apos;s connector URL field.
        </p>
        {endpoint ? (
          <CopyField value={endpoint} label="Copy MCP URL" />
        ) : error ? null : (
          <Skeleton className="h-12 w-full rounded-lg" />
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-muted p-4">
        <p className="text-label font-medium text-foreground">Claude, ChatGPT, or Cursor</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-body-sm text-foreground-secondary">
          <li>Add a custom connector with the MCP server URL above.</li>
          <li>
            When asked how to authenticate, choose{" "}
            <strong className="font-semibold text-foreground">Sign in now</strong>.
          </li>
          <li>Complete the TubeCP sign-in flow in your browser.</li>
          <li>Enable the connector in chat and ask it to use TubeCP tools.</li>
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-label font-medium text-foreground">Claude Code or Cursor (CLI)</p>
        <CopyField value={cliCommand} label="Copy CLI command" />
        <p className="text-label text-foreground-secondary">
          The CLI completes OAuth automatically after you add the server.
        </p>
      </div>

      {error && <FormAlert kind="error">{error}</FormAlert>}
    </SettingsSection>
  );
}
