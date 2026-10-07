import type { Metadata } from "next";
import Link from "next/link";
import DocsPage from "@/components/DocsPage";
import { PRODUCT_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Connect MCP to Claude & Cursor | ${PRODUCT_NAME}`,
  description: `Step-by-step guide to connect ${PRODUCT_NAME} hosted MCP to Claude, Cursor, and ChatGPT with OAuth.`,
};

export const dynamic = "force-static";

const MCP_URL = "https://tubecp.vercel.app/api/mcp";

export default function McpDocsPage() {
  return (
    <DocsPage
      title="Connect TubeCP to Claude & Cursor"
      subtitle="Sign in with your TubeCP account — no API keys to copy."
    >
      <p>
        TubeCP exposes a <strong>hosted MCP server</strong> over HTTPS with <strong>OAuth</strong>.
        Your AI client connects to one URL, runs a sign-in flow, and then calls tools such as{" "}
        <code>research_youtube</code> using your TubeCP account quota.
      </p>

      <h2>What you need</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>MCP server URL</strong></td>
            <td><code>{MCP_URL}</code></td>
          </tr>
          <tr>
            <td><strong>Authentication</strong></td>
            <td>OAuth — sign in with your TubeCP account when prompted</td>
          </tr>
          <tr>
            <td><strong>TubeCP account</strong></td>
            <td>
              <Link href="/sign-up">Create one</Link> or <Link href="/sign-in">sign in</Link> before
              connecting
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Claude (claude.ai)</h2>
      <ol>
        <li>Open <strong>Settings → Connectors → Add custom connector</strong>.</li>
        <li><strong>Name:</strong> <code>TubeCP</code></li>
        <li><strong>MCP server URL:</strong> <code>{MCP_URL}</code></li>
        <li>Click <strong>Continue</strong>.</li>
        <li>
          Under <strong>Authentication</strong>, keep <strong>Sign in now</strong> selected. Claude
          should detect OAuth automatically.
        </li>
        <li>
          Under <strong>OAuth client</strong>, keep <strong>Use Claude&apos;s published identity</strong>{" "}
          (recommended).
        </li>
        <li>Click <strong>Add</strong>, complete the TubeCP sign-in flow, then enable the connector in chat.</li>
      </ol>

      <h2>ChatGPT</h2>
      <ol>
        <li>Enable <strong>Settings → Apps → Advanced → Developer mode</strong>.</li>
        <li>Go to <strong>Settings → Connectors → Create</strong>.</li>
        <li><strong>Connector URL:</strong> <code>{MCP_URL}</code></li>
        <li>Choose <strong>OAuth</strong> authentication and complete sign-in when prompted.</li>
      </ol>

      <h2>Cursor</h2>
      <ol>
        <li>Open <strong>Cursor Settings → MCP</strong> or run:</li>
      </ol>
      <pre>
        <code>{`claude mcp add tubecp --transport http ${MCP_URL}`}</code>
      </pre>
      <p>Cursor completes the OAuth flow in your browser after you add the server.</p>

      <h2>Claude Code (CLI)</h2>
      <pre>
        <code>{`claude mcp add tubecp --transport http ${MCP_URL}`}</code>
      </pre>
      <p>Run <code>/mcp</code> in Claude Code if you need to finish or refresh authentication.</p>

      <h2>Claude Desktop (mcp-remote fallback)</h2>
      <p>If your desktop build does not support remote OAuth connectors yet:</p>
      <pre>
        <code>
          {`{
  "mcpServers": {
    "tubecp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${MCP_URL}", "--transport", "http-only"]
    }
  }
}`}
        </code>
      </pre>

      <h2>Available tools</h2>
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>search_youtube</code></td>
            <td>Search YouTube for candidate videos</td>
          </tr>
          <tr>
            <td><code>get_transcript</code></td>
            <td>Fetch captions for a video</td>
          </tr>
          <tr>
            <td><code>analyze_video</code></td>
            <td>Score whether a video discusses a topic</td>
          </tr>
          <tr>
            <td><code>research_youtube</code></td>
            <td>Full search → analyze → rank pipeline</td>
          </tr>
          <tr>
            <td><code>build_knowledge_base</code></td>
            <td>Transcribe, chunk, and embed ranked videos (paid)</td>
          </tr>
          <tr>
            <td><code>chat_with_knowledge_base</code></td>
            <td>RAG chat with citations (paid)</td>
          </tr>
        </tbody>
      </table>

      <h2>Troubleshooting</h2>
      <table>
        <thead>
          <tr>
            <th>Symptom</th>
            <th>Fix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Connector asks for an API key / request headers</td>
            <td>
              Choose <strong>Sign in now</strong> (OAuth), not manual bearer tokens. TubeCP no longer
              requires copying <code>tcp_…</code> keys for normal client setup.
            </td>
          </tr>
          <tr>
            <td>OAuth loop or sign-in fails</td>
            <td>
              Make sure you have a TubeCP account and complete sign-in at{" "}
              <Link href="/sign-in">/sign-in</Link> when redirected.
            </td>
          </tr>
          <tr>
            <td><code>Sign in required</code> / <code>AUTH_REQUIRED</code></td>
            <td>
              Redeploy the latest app — the MCP endpoint must use OAuth, not web-session auth.
            </td>
          </tr>
          <tr>
            <td>Tools not visible</td>
            <td>Restart the client and enable the TubeCP connector in the chat tools menu.</td>
          </tr>
        </tbody>
      </table>

      <p>
        Endpoint URL is also shown on <Link href="/account">Account → Hosted MCP</Link>.
      </p>
    </DocsPage>
  );
}
