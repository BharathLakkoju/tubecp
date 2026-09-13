#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./create-server.js";

async function main() {
  const server = createMcpServer({ userId: "local" });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("YouTube Research MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
