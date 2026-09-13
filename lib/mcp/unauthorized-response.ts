import { getMcpProtectedResourceMetadataUrl } from "@/lib/mcp/oauth/config";

export function mcpUnauthorizedResponse(message = "Unauthorized"): Response {
  const resourceMetadata = getMcpProtectedResourceMetadataUrl();

  return Response.json(
    {
      error: message,
      code: "MCP_UNAUTHORIZED",
      hint: "Sign in through your MCP client or complete the TubeCP OAuth flow.",
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer realm="tubecp", resource_metadata="${resourceMetadata}"`,
      },
    }
  );
}
