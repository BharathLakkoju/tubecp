import type { Metadata } from "next";
import Link from "next/link";
import DocsPage from "@/components/DocsPage";
import { PRODUCT_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Connect MCP to Claude & Cursor | ${PRODUCT_NAME}`,
  description: `Step-by-step guide to connect ${PRODUCT_NAME} hosted MCP to Claude, Cursor, and ChatGPT.`,
};

export const dynamic = "force-static";

const HOSTED_CONFIG = `{
  "mcpServers": {
    "tubecp-hosted": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer tcp_YOUR_KEY_HERE"
      }
    }
  }
}`;

export default function McpDocsPage() {
  return (
    <DocsPage
      title="Connect TubeCP to Claude & Cursor"
      subtitle="Use hosted MCP from your AI client — no local server required."
    >
      <p>
        TubeCP exposes a <strong>hosted MCP server</strong> over HTTPS. Your AI client (Claude,
        Cursor, ChatGPT, etc.) calls TubeCP tools such as <code>research_youtube</code> on your
        behalf. You authenticate with two separate values from your TubeCP account — do not mix
        them up.
      </p>

      <h2>Two values — two different fields</h2>
      <p>
        After you generate a key under <Link href="/account">Account → Hosted MCP</Link>, you
        receive:
      </p>
      <table className="docs-table">
        <thead>
          <tr>
            <th>What TubeCP gives you</th>
            <th>Example</th>
            <th>Where it goes in your MCP client</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>MCP server URL</strong> (endpoint)</td>
            <td><code>https://your-app.vercel.app/api/mcp</code></td>
            <td>The <strong>MCP server URL</strong> field</td>
          </tr>
          <tr>
            <td><strong>API key</strong> (shown once)</td>
            <td><code>tcp_abc123…</code></td>
            <td>
              <strong>Authorization</strong> header: <code>Bearer tcp_abc123…</code> — not the URL
              field
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Common mistake:</strong> pasting your <code>tcp_…</code> key into the MCP server URL
        box. Claude and ChatGPT expect an <code>https://…/api/mcp</code> address there. The API key
        is sent separately as a bearer token on every request.
      </p>

      <h2>Step 1 — Get your credentials</h2>
      <ol>
        <li>
          <Link href="/sign-in">Sign in</Link> to TubeCP (or{" "}
          <Link href="/sign-up">create an account</Link>).
        </li>
        <li>Open <Link href="/account">Account</Link> → <strong>Hosted MCP</strong>.</li>
        <li>Click <strong>Generate MCP API key</strong>.</li>
        <li>
          Copy <strong>both</strong> the endpoint URL and the API key immediately — the key is shown
          only once.
        </li>
      </ol>
      <p>
        Hosted MCP uses your TubeCP account quota and server-side API keys. You do not need your own
        YouTube or OpenRouter keys for this path.
      </p>

      <h2>Claude (claude.ai) — custom connector</h2>
      <ol>
        <li>In Claude, open <strong>Settings → Connectors → Add custom connector</strong>.</li>
        <li>
          <strong>Name:</strong> <code>TubeCP</code> (or any label you prefer).
        </li>
        <li>
          <strong>MCP server URL:</strong> paste your TubeCP <strong>endpoint</strong> (must end in{" "}
          <code>/api/mcp</code>).
        </li>
        <li>Click <strong>Continue</strong>.</li>
        <li>
          On the next screen, if you see <strong>Request headers</strong>, add:
          <ul>
            <li>Header name: <code>Authorization</code></li>
            <li>
              Value: <code>Bearer tcp_YOUR_KEY</code> — include the word <code>Bearer</code>, a space,
              then your key
            </li>
          </ul>
        </li>
        <li>Save or connect, then enable the TubeCP connector in a new chat.</li>
        <li>
          Try a prompt like: <em>&quot;Use TubeCP to research React Server Components on YouTube and
          summarize the top videos.&quot;</em>
        </li>
      </ol>
      <p>
        <strong>Note:</strong> Claude&apos;s first screen only asks for the URL. The API key goes on a
        later step (request headers). If your plan does not show request headers yet, use Claude
        Desktop or Claude Code below — they support bearer tokens reliably today.
      </p>

      <h3>Claude Desktop (config file)</h3>
      <p>
        Edit <code>claude_desktop_config.json</code> (
        <code>~/Library/Application Support/Claude/</code> on macOS,{" "}
        <code>%APPDATA%\Claude\</code> on Windows) and merge:
      </p>
      <pre><code>{HOSTED_CONFIG}</code></pre>
      <p>Fully quit and reopen Claude Desktop.</p>

      <h3>Claude Code (CLI)</h3>
      <pre>
        <code>
          {`claude mcp add tubecp --transport http https://your-app.vercel.app/api/mcp \\
  --header "Authorization: Bearer tcp_YOUR_KEY_HERE"`}
        </code>
      </pre>

      <h2>Cursor</h2>
      <ol>
        <li>Open <strong>Cursor Settings → MCP</strong> (or edit your MCP config file directly).</li>
        <li>
          Config file locations:
          <ul>
            <li>macOS / Linux: <code>~/.cursor/mcp.json</code></li>
            <li>Windows: <code>%USERPROFILE%\\.cursor\\mcp.json</code></li>
          </ul>
        </li>
        <li>Add the hosted block (replace URL and key with yours):</li>
      </ol>
      <pre><code>{HOSTED_CONFIG}</code></pre>
      <ol start={4}>
        <li>Restart Cursor or reload MCP servers.</li>
        <li>In Agent or Chat, enable the <strong>tubecp-hosted</strong> tools.</li>
      </ol>

      <h2>ChatGPT — custom connector</h2>
      <p>ChatGPT connects to remote HTTPS MCP servers (not local stdio). You need a paid plan and developer mode.</p>
      <ol>
        <li>
          Enable <strong>Settings → Apps → Advanced → Developer mode</strong>.
        </li>
        <li>Go to <strong>Settings → Connectors → Create</strong>.</li>
        <li>
          <strong>Name:</strong> <code>TubeCP</code>
        </li>
        <li>
          <strong>Connector URL:</strong> your TubeCP endpoint (<code>https://…/api/mcp</code>).
        </li>
        <li>
          <strong>Authentication:</strong> choose <strong>Token</strong> or <strong>API Key (Bearer)</strong> — not OAuth.
        </li>
        <li>
          Paste your <code>tcp_…</code> key (or the full <code>Bearer tcp_…</code> value if the form asks for it).
        </li>
        <li>Enable the connector in a chat via the tools menu.</li>
      </ol>

      <h2>Available tools</h2>
      <table className="docs-table">
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
      <table className="docs-table">
        <thead>
          <tr>
            <th>Symptom</th>
            <th>Fix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>401 Unauthorized</code></td>
            <td>
              Check the <code>Authorization</code> header is <code>Bearer tcp_…</code> with no typos.
              Regenerate the key in Account if you lost it.
            </td>
          </tr>
          <tr>
            <td>Connector fails immediately in Claude web</td>
            <td>
              Your account may not support request headers yet. Use Claude Desktop, Claude Code, or
              Cursor with the JSON config above.
            </td>
          </tr>
          <tr>
            <td>Tools not visible</td>
            <td>Restart the client after editing MCP config. Enable the connector in the chat tools menu.</td>
          </tr>
          <tr>
            <td>Used <code>localhost</code> URL from cloud Claude/ChatGPT</td>
            <td>
              Use your public deployed URL (from Account → Hosted MCP), not <code>http://localhost:3000</code>.
            </td>
          </tr>
          <tr>
            <td>Pasted API key into URL field</td>
            <td>
              URL must be <code>https://…/api/mcp</code>. Put the key in the Authorization / Bearer field
              only.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Security</h2>
      <ul>
        <li>Treat your <code>tcp_…</code> key like a password — anyone with it can use your TubeCP quota.</li>
        <li>Never commit API keys to git or share them in public channels.</li>
        <li>Do not put tokens in URL query parameters (<code>?token=</code>).</li>
        <li>Revoke and regenerate keys from Account if one is exposed.</li>
      </ul>

      <p>
        Need credentials? <Link href="/account">Open Account → Hosted MCP</Link>. Questions? See{" "}
        <Link href="/pricing">pricing</Link> for plan limits.
      </p>
    </DocsPage>
  );
}
