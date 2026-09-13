import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMcpTools, type McpToolContext } from "./register-tools";

export function createMcpServer(ctx: McpToolContext): McpServer {
  const server = new McpServer({
    name: "youtube-research-agent",
    version: "0.2.0",
  });

  registerMcpTools(server, ctx);
  return server;
}
