import { getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/sdk/server/auth/router.js";
import type { OAuthMetadata, OAuthProtectedResourceMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import { getAppUrl } from "@/lib/app-url";
import { getMcpEndpoint } from "@/lib/mcp/endpoint";

export const MCP_OAUTH_SCOPES = ["mcp:tools"] as const;

export function getMcpOAuthIssuerUrl(): URL {
  return new URL(getAppUrl());
}

export function getMcpOAuthBaseUrl(): URL {
  return new URL(`${getAppUrl()}/api/mcp/oauth/`);
}

export function getMcpResourceServerUrl(): URL {
  return new URL(getMcpEndpoint());
}

export function getMcpProtectedResourceMetadataUrl(): string {
  return getOAuthProtectedResourceMetadataUrl(getMcpResourceServerUrl());
}

export function getMcpOAuthMetadata(): OAuthMetadata {
  const issuer = getMcpOAuthIssuerUrl();
  const base = getMcpOAuthBaseUrl();

  return {
    issuer: issuer.href,
    authorization_endpoint: new URL("authorize", base).href,
    token_endpoint: new URL("token", base).href,
    registration_endpoint: new URL("register", base).href,
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    scopes_supported: [...MCP_OAUTH_SCOPES],
    service_documentation: `${getAppUrl()}/docs/mcp`,
  };
}

export function getMcpProtectedResourceMetadata(): OAuthProtectedResourceMetadata {
  const oauthMetadata = getMcpOAuthMetadata();

  return {
    resource: getMcpResourceServerUrl().href,
    authorization_servers: [oauthMetadata.issuer],
    scopes_supported: [...MCP_OAUTH_SCOPES],
    resource_name: "TubeCP",
    resource_documentation: `${getAppUrl()}/docs/mcp`,
  };
}
