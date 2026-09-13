import type { Response } from "express";
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { issueMcpAccessToken, verifyMcpAccessToken } from "@/lib/mcp/oauth/access-token";
import { mcpOAuthClientsStore } from "@/lib/mcp/oauth/clients-store";
import {
  consumeAuthorizationCode,
  consumeRefreshToken,
  getAuthorizationCodeChallenge,
  storeAuthorizationCode,
  storeRefreshToken,
} from "@/lib/mcp/oauth/store";
import { MCP_OAUTH_SCOPES } from "@/lib/mcp/oauth/config";

let providerSingleton: TubeCpMcpOAuthProvider | null = null;

export class TubeCpMcpOAuthProvider implements OAuthServerProvider {
  clientsStore = mcpOAuthClientsStore;

  async authorize(
    _client: OAuthClientInformationFull,
    _params: AuthorizationParams,
    _res: Response
  ): Promise<void> {
    throw new Error("Use the Next.js /api/mcp/oauth/authorize route");
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const challenge = await getAuthorizationCodeChallenge(authorizationCode);
    if (!challenge) {
      throw new Error("Unknown authorization code");
    }
    return challenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    const record = await consumeAuthorizationCode(authorizationCode);
    if (!record || record.clientId !== client.client_id) {
      throw new Error("Invalid authorization code");
    }

    const scopes =
      record.scopes.length > 0 ? record.scopes : [...MCP_OAUTH_SCOPES];
    const { accessToken, expiresIn } = issueMcpAccessToken({
      userId: record.userId,
      clientId: client.client_id,
      scopes,
    });
    const refreshToken = await storeRefreshToken({
      userId: record.userId,
      clientId: client.client_id,
      scopes,
    });

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: scopes.join(" "),
    };
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    _resource?: URL
  ): Promise<OAuthTokens> {
    const record = await consumeRefreshToken(refreshToken);
    if (!record || record.clientId !== client.client_id) {
      throw new Error("Invalid refresh token");
    }

    const nextScopes =
      scopes && scopes.length > 0 ? scopes : record.scopes.length > 0 ? record.scopes : [...MCP_OAUTH_SCOPES];
    const { accessToken, expiresIn } = issueMcpAccessToken({
      userId: record.userId,
      clientId: client.client_id,
      scopes: nextScopes,
    });
    const nextRefreshToken = await storeRefreshToken({
      userId: record.userId,
      clientId: client.client_id,
      scopes: nextScopes,
    });

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: nextRefreshToken,
      scope: nextScopes.join(" "),
    };
  }

  async verifyAccessToken(token: string) {
    const authInfo = verifyMcpAccessToken(token);
    if (!authInfo) {
      throw new Error("Invalid access token");
    }
    return authInfo;
  }
}

export function getMcpOAuthProvider(): TubeCpMcpOAuthProvider {
  if (!providerSingleton) {
    providerSingleton = new TubeCpMcpOAuthProvider();
  }
  return providerSingleton;
}

export async function completeMcpAuthorization(input: {
  userId: string;
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
}): Promise<string> {
  const code = await storeAuthorizationCode({
    userId: input.userId,
    clientId: input.client.client_id,
    codeChallenge: input.params.codeChallenge,
    redirectUri: input.params.redirectUri,
    scopes:
      input.params.scopes && input.params.scopes.length > 0
        ? input.params.scopes
        : [...MCP_OAUTH_SCOPES],
    resource: input.params.resource?.href,
  });

  const redirectUrl = new URL(input.params.redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (input.params.state) {
    redirectUrl.searchParams.set("state", input.params.state);
  }

  return redirectUrl.toString();
}
