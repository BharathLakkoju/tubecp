import { resolveMcpApiKey } from "@/lib/mcp/api-keys";
import { verifyMcpAccessToken } from "@/lib/mcp/oauth/access-token";

export type McpAuthResult = {
  userId: string;
  source: "oauth" | "api_key" | "service_key";
};

function extractBearerToken(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export function extractMcpApiToken(req: Request): string | null {
  const bearer = extractBearerToken(req.headers.get("authorization"));
  if (bearer) {
    return bearer;
  }

  const apiKey = req.headers.get("x-api-key")?.trim();
  return apiKey || null;
}

export async function authenticateMcpRequest(req: Request): Promise<McpAuthResult | null> {
  const token = extractMcpApiToken(req);
  if (!token) {
    return null;
  }

  const oauthAuth = verifyMcpAccessToken(token);
  if (oauthAuth?.extra?.userId && typeof oauthAuth.extra.userId === "string") {
    return { userId: oauthAuth.extra.userId, source: "oauth" };
  }

  const serviceKey = process.env.MCP_API_KEY?.trim();
  if (serviceKey && token === serviceKey) {
    return { userId: "service", source: "service_key" };
  }

  if (token.startsWith("tcp_")) {
    const resolved = await resolveMcpApiKey(token);
    if (resolved) {
      return { userId: resolved.userId, source: "api_key" };
    }
  }

  return null;
}
