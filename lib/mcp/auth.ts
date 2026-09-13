import { resolveMcpApiKey } from "@/lib/mcp/api-keys";

export type McpAuthResult = {
  userId: string;
  source: "api_key" | "service_key";
};

export async function authenticateMcpRequest(req: Request): Promise<McpAuthResult | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const serviceKey = process.env.MCP_API_KEY?.trim();
  if (serviceKey && token === serviceKey) {
    return { userId: "service", source: "service_key" };
  }

  const resolved = await resolveMcpApiKey(token);
  if (!resolved) {
    return null;
  }

  return { userId: resolved.userId, source: "api_key" };
}
