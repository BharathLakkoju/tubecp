# TubeCP MCP client setup

Use the TubeCP MCP server from **Cursor**, **Claude**, **ChatGPT**, **Claude Code**, **Windsurf**, **Zed**, or any client that supports the [Model Context Protocol](https://modelcontextprotocol.io).

**User-facing guide:** `/docs/mcp` in the app.

TubeCP supports two MCP modes:

1. **Hosted HTTP (SaaS)** — connect to `/api/mcp` with OAuth (recommended).
2. **Local stdio** — run `npm run dev:mcp` with your own API keys.

## Hosted MCP (SaaS) — OAuth

1. Create a TubeCP account and sign in.
2. Copy the MCP server URL from **Account → Hosted MCP** (e.g. `https://tubecp.vercel.app/api/mcp`).
3. In your MCP client, add a custom connector with that URL.
4. Choose **Sign in now** / OAuth when prompted.
5. Complete the TubeCP sign-in flow in your browser.

No API keys to copy. Access is tied to your TubeCP account and plan limits.

### Claude (claude.ai)

1. Settings → Connectors → Add custom connector
2. MCP server URL: `https://…/api/mcp`
3. Continue → keep **Sign in now** and **Use Claude's published identity**
4. Add → sign in to TubeCP → enable connector in chat

### Claude Code

```bash
claude mcp add tubecp --transport http https://tubecp.vercel.app/api/mcp
```

### Cursor

Add the same URL in **Cursor Settings → MCP**, or use the Claude Code command above.

### ChatGPT

Enable developer mode, create a connector with the MCP URL, and choose OAuth.

## Local stdio (advanced)

See `mcp/clients/tubecp.mcp.json` and set `YOUTUBE_API_KEY`, `OPENROUTER_API_KEY`, optional `LICENSE_KEY`.

## Automation / CI

Set `MCP_API_KEY` on the server for a shared service bearer token. This is for operators only — not end-user setup.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Client asks for manual API key | Use OAuth / Sign in now instead of request headers |
| OAuth sign-in fails | Ensure you have a TubeCP account; try again in a private window |
| `AUTH_REQUIRED` on MCP URL | Redeploy latest app; `/api/mcp` must be public with OAuth metadata |
| Tools not visible | Restart client; enable connector in chat |
