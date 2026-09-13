import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpServerImplementation } from "@/lib/mcp/branding";
import { registerMcpTools, type McpToolContext } from "./register-tools";

export function createMcpServer(ctx: McpToolContext): McpServer {
  const server = new McpServer(getMcpServerImplementation());

  registerMcpTools(server, ctx);
  return server;
}
