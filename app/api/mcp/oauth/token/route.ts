import { NextRequest, NextResponse } from "next/server";
import { verifyChallenge } from "pkce-challenge";
import { getMcpOAuthProvider } from "@/lib/mcp/oauth/provider";

export const dynamic = "force-dynamic";

function oauthError(error: string, description?: string, status = 400) {
  return NextResponse.json(
    {
      error,
      error_description: description,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const grantType = body.get("grant_type")?.toString();
  const clientId = body.get("client_id")?.toString();

  if (!grantType || !clientId) {
    return oauthError("invalid_request", "grant_type and client_id are required");
  }

  const provider = getMcpOAuthProvider();
  const client = await provider.clientsStore.getClient(clientId);
  if (!client) {
    return oauthError("invalid_client", "Unknown client_id");
  }

  try {
    if (grantType === "authorization_code") {
      const code = body.get("code")?.toString();
      const codeVerifier = body.get("code_verifier")?.toString();
      const redirectUri = body.get("redirect_uri")?.toString();
      const resource = body.get("resource")?.toString();

      if (!code || !codeVerifier) {
        return oauthError("invalid_request", "code and code_verifier are required");
      }

      const codeChallenge = await provider.challengeForAuthorizationCode(client, code);
      if (!(await verifyChallenge(codeVerifier, codeChallenge))) {
        return oauthError("invalid_grant", "code_verifier does not match the challenge");
      }

      const tokens = await provider.exchangeAuthorizationCode(
        client,
        code,
        codeVerifier,
        redirectUri,
        resource ? new URL(resource) : undefined
      );

      return NextResponse.json(tokens, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    if (grantType === "refresh_token") {
      const refreshToken = body.get("refresh_token")?.toString();
      const scope = body.get("scope")?.toString();
      const resource = body.get("resource")?.toString();

      if (!refreshToken) {
        return oauthError("invalid_request", "refresh_token is required");
      }

      const tokens = await provider.exchangeRefreshToken(
        client,
        refreshToken,
        scope?.split(" ").filter(Boolean),
        resource ? new URL(resource) : undefined
      );

      return NextResponse.json(tokens, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    return oauthError("unsupported_grant_type");
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    return oauthError("invalid_grant", message);
  }
}
