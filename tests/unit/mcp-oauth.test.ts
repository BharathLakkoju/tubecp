import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store/redis", () => ({
  getRedis: () => null,
}));

import { issueMcpAccessToken, verifyMcpAccessToken } from "@/lib/mcp/oauth/access-token";
import { getMcpOAuthMetadata, getMcpProtectedResourceMetadata } from "@/lib/mcp/oauth/config";
import { mcpOAuthClientsStore } from "@/lib/mcp/oauth/clients-store";
import { getMcpOAuthProvider } from "@/lib/mcp/oauth/provider";

describe("mcp oauth", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://tubecp.vercel.app";
  });

  it("advertises oauth metadata for MCP clients", () => {
    const metadata = getMcpOAuthMetadata();
    expect(metadata.authorization_endpoint).toContain("/api/mcp/oauth/authorize");
    expect(metadata.token_endpoint).toContain("/api/mcp/oauth/token");
    expect(metadata.registration_endpoint).toContain("/api/mcp/oauth/register");

    const protectedResource = getMcpProtectedResourceMetadata();
    expect(protectedResource.resource).toBe("https://tubecp.vercel.app/api/mcp");
    expect(protectedResource.authorization_servers?.[0]?.href).toBe("https://tubecp.vercel.app/");
  });

  it("issues and verifies access tokens", () => {
    const { accessToken } = issueMcpAccessToken({
      userId: "user-1",
      clientId: "client-1",
      scopes: ["mcp:tools"],
    });

    const authInfo = verifyMcpAccessToken(accessToken);
    expect(authInfo?.extra?.userId).toBe("user-1");
    expect(authInfo?.clientId).toBe("client-1");
  });

  it("exchanges authorization codes for tokens", async () => {
    const registered = await mcpOAuthClientsStore.registerClient!({
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "Claude",
    });

    const provider = getMcpOAuthProvider();
    const codeChallenge = "challenge";
    const { completeMcpAuthorization } = await import("@/lib/mcp/oauth/provider");
    const redirect = await completeMcpAuthorization({
      userId: "user-42",
      client: registered,
      params: {
        codeChallenge,
        redirectUri: registered.redirect_uris[0]!,
        scopes: ["mcp:tools"],
      },
    });

    const authCode = new URL(redirect).searchParams.get("code");
    expect(authCode).toBeTruthy();

    const tokens = await provider.exchangeAuthorizationCode(
      registered,
      authCode!,
      "verifier"
    );

    expect(tokens.access_token).toBeTruthy();
    expect(verifyMcpAccessToken(tokens.access_token)?.extra?.userId).toBe("user-42");
  });
});
