import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/mcp/create-server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { mcpUnauthorizedResponse } from "@/lib/mcp/unauthorized-response";
import { RateLimitError, rateLimitApi } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

function mcpRateLimitKey(req: Request, userId: string): string {
  if (userId !== "service") {
    return userId;
  }
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `service:${ip}`;
}

async function handleMcp(req: Request): Promise<Response> {
  const auth = await authenticateMcpRequest(req);
  if (!auth) {
    return mcpUnauthorizedResponse();
  }

  try {
    await rateLimitApi(mcpRateLimitKey(req, auth.userId), "mcp", 60);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return Response.json({ error: err.message, code: err.code }, { status: 429 });
    }
    throw err;
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
