import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/mcp/create-server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

async function handleMcp(req: Request): Promise<Response> {
  const auth = await authenticateMcpRequest(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized — provide Authorization: Bearer <MCP API key>" }, {
      status: 401,
    });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = createMcpServer({
    userId: auth.userId,
    licenseKey: process.env.LICENSE_KEY,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function GET(req: Request) {
  return handleMcp(req);
}

export async function POST(req: Request) {
  return handleMcp(req);
}

export async function DELETE(req: Request) {
  return handleMcp(req);
}
