import { redirectUriMatches } from "@modelcontextprotocol/sdk/server/auth/handlers/authorize.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

export type ParsedAuthorizeRequest = {
  clientId: string;
  redirectUri: string;
  responseType: "code";
  codeChallenge: string;
  codeChallengeMethod: "S256";
  state?: string;
  scope?: string;
  resource?: string;
};

export function parseAuthorizeRequest(
  source: URLSearchParams | Record<string, string>
): ParsedAuthorizeRequest {
  const get = (key: string) => {
    if (source instanceof URLSearchParams) {
      return source.get(key) ?? undefined;
    }
    return source[key];
  };

  const clientId = get("client_id");
  const redirectUri = get("redirect_uri");
  const responseType = get("response_type");
  const codeChallenge = get("code_challenge");
  const codeChallengeMethod = get("code_challenge_method");
  const state = get("state");
  const scope = get("scope");
  const resource = get("resource");

  if (!clientId) {
    throw new Error("client_id is required");
  }
  if (responseType !== "code") {
    throw new Error("response_type must be code");
  }
  if (!codeChallenge) {
    throw new Error("code_challenge is required");
  }
  if (codeChallengeMethod !== "S256") {
    throw new Error("code_challenge_method must be S256");
  }

  return {
    clientId,
    redirectUri: redirectUri ?? "",
    responseType: "code",
    codeChallenge,
    codeChallengeMethod: "S256",
    state,
    scope,
    resource,
  };
}

export function resolveRedirectUri(
  client: OAuthClientInformationFull,
  requested?: string
): string {
  if (requested) {
    if (!client.redirect_uris.some((registered) => redirectUriMatches(requested, registered))) {
      throw new Error("Unregistered redirect_uri");
    }
    return requested;
  }

  if (client.redirect_uris.length === 1) {
    return client.redirect_uris[0]!;
  }

  throw new Error("redirect_uri must be specified when client has multiple registered URIs");
}
