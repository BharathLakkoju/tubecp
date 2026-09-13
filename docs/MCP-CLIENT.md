# TubeCP MCP client setup

Use the TubeCP MCP server from **Cursor**, **Claude Desktop**, **Claude Code**, **Windsurf**, **Zed**, **ChatGPT** (desktop with MCP), **Gemini CLI**, or any client that supports the [Model Context Protocol](https://modelcontextprotocol.io).

TubeCP supports two MCP modes:

1. **Hosted HTTP (SaaS)** — connect to your deployed app at `/api/mcp` with a per-user API key (recommended for production).
2. **Local stdio** — run `npm run dev:mcp` with your own API keys (YouTube Data API + OpenRouter).

## Prerequisites

1. Clone this repo and install dependencies:

```bash
git clone https://github.com/YOUR_ORG/youtube-mcp-agent.git
cd youtube-mcp-agent
npm install
```

2. Copy `.env.example` to `.env.local` and set at minimum:

| Variable | Required | Notes |
|----------|----------|-------|
| `YOUTUBE_API_KEY` | Yes | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `OPENROUTER_API_KEY` | Yes | [OpenRouter](https://openrouter.ai/keys) |
| `LICENSE_KEY` | Production / paid tools | Required when `NODE_ENV=production` or when distributing the MCP binary |

3. Verify the server starts:

```bash
npm run dev:mcp
```

You should see `YouTube Research MCP server running on stdio` on stderr.

## Hosted MCP (SaaS)

1. Sign in to TubeCP → **Account** → **Hosted MCP** → **Generate MCP API key**.
2. Copy the endpoint URL and API key (shown once).
3. Add to your MCP client:

```json
{
  "mcpServers": {
    "tubecp-hosted": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer tcp_YOUR_KEY_HERE"
      }
    }
  }
}
```

Hosted MCP uses your TubeCP account quota and server-side API keys — no local repo or stdio process required.

Optional server env: `MCP_API_KEY` for a shared service key (automation/CI).

## Quick copy-paste config (local stdio)

Edit `mcp/clients/tubecp.mcp.json`:

- Replace `/ABSOLUTE/PATH/TO/youtube-mcp-agent` with your real path (use forward slashes even on Windows, e.g. `D:/workFiles/youtube-mcp-agent`).
- Fill in your API keys in `env`.

Then copy the `mcpServers.tubecp` block into your client's MCP settings.

### Windows alternative (direct `tsx`)

```json
{
  "mcpServers": {
    "tubecp": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "D:/workFiles/youtube-mcp-agent",
      "env": {
        "YOUTUBE_API_KEY": "your-key",
        "OPENROUTER_API_KEY": "your-key"
      }
    }
  }
}
```

## Client-specific instructions

### Cursor

1. Open **Cursor Settings → MCP** (or edit `~/.cursor/mcp.json`).
2. Add the `tubecp` entry from `mcp/clients/tubecp.mcp.json`.
3. Restart Cursor or reload MCP servers.
4. In Agent/Chat, enable the **tubecp** tools.

Config file locations:

- **macOS/Linux:** `~/.cursor/mcp.json`
- **Windows:** `%USERPROFILE%\.cursor\mcp.json`

### Claude Desktop

1. Edit `claude_desktop_config.json`:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
2. Merge the `mcpServers` block from `tubecp.mcp.json`.
3. Fully quit and reopen Claude Desktop.

### Claude Code (CLI)

```bash
claude mcp add tubecp -- npm run dev:mcp
```

Or add manually to `~/.claude.json` under `mcpServers` using the JSON template above (set `cwd`).

### Windsurf

1. Open Windsurf settings → **Cascade → MCP**.
2. Add a new stdio server with the same `command`, `args`, `cwd`, and `env` as the template.

### Zed

Add to Zed `settings.json` under `context_servers` (see [Zed MCP docs](https://zed.dev/docs/assistant/context-servers)):

```json
{
  "context_servers": {
    "tubecp": {
      "command": {
        "path": "npm",
        "args": ["run", "dev:mcp"],
        "env": {
          "YOUTUBE_API_KEY": "your-key",
          "OPENROUTER_API_KEY": "your-key"
        }
      },
      "cwd": "/ABSOLUTE/PATH/TO/youtube-mcp-agent"
    }
  }
}
```

### ChatGPT desktop (MCP connectors)

If your ChatGPT desktop build supports local MCP:

1. Settings → **Connectors** → **Add connector**.
2. Choose **stdio** / local command.
3. Command: `npm`, args: `run dev:mcp`, working directory: your repo path, env: API keys.

(Exact UI varies by release; use the same env vars as above.)

### Gemini CLI / other MCP hosts

Any host that accepts **stdio MCP** can use:

- **Command:** `npm`
- **Args:** `run`, `dev:mcp`
- **CWD:** absolute path to this repo
- **Env:** `YOUTUBE_API_KEY`, `OPENROUTER_API_KEY`, optional `LICENSE_KEY`

## Available tools

| Tool | Description |
|------|-------------|
| `search_youtube` | Search YouTube for candidate videos |
| `get_transcript` | Fetch captions for a video |
| `analyze_video` | Score whether a video discusses a topic |
| `research_youtube` | Full search → analyze → rank pipeline |
| `build_knowledge_base` | Transcribe, chunk, embed ranked videos (license-gated) |
| `chat_with_knowledge_base` | RAG chat with citations (license-gated) |

Free-tier MCP usage uses your API keys. Paid KB/chat tools require a valid `LICENSE_KEY` from your TubeCP account.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Server exits immediately | Run `npm run dev:mcp` in a terminal; check missing `YOUTUBE_API_KEY` / `OPENROUTER_API_KEY` |
| `Invalid license key` | Set `LICENSE_KEY` in MCP `env` (required in production) |
| Tools not visible | Restart the client after editing MCP config |
| Windows path errors | Use `cwd` with forward slashes; prefer `npx tsx mcp/server.ts` |

## Security notes

- Never commit API keys or `LICENSE_KEY` to git.
- MCP runs locally with your keys; treat the config like a password.
- `E2E_AUTH_BYPASS` and `DEV_BYPASS_USAGE_LIMITS` are disabled automatically in production deployments.
