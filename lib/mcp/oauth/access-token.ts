import crypto from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { getMcpResourceServerUrl } from "@/lib/mcp/oauth/config";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

type AccessTokenPayload = {
  sub: string;
  cid: string;
  scope: string;
  exp: number;
};

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required for MCP OAuth access tokens");
  }
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(data).digest("base64url");
}

export function issueMcpAccessToken(input: {
  userId: string;
  clientId: string;
  scopes: string[];
}): { accessToken: string; expiresIn: number } {
  const payload: AccessTokenPayload = {
    sub: input.userId,
    cid: input.clientId,
    scope: input.scopes.join(" "),
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);

  return {
    accessToken: `${encodedPayload}.${signature}`,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export function verifyMcpAccessToken(token: string): AuthInfo | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  if (sign(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as AccessTokenPayload;

    if (!payload.sub || !payload.cid || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    const scopes = payload.scope ? payload.scope.split(" ").filter(Boolean) : [];

    return {
      token,
      clientId: payload.cid,
      scopes,
      expiresAt: payload.exp,
      resource: getMcpResourceServerUrl(),
      extra: {
        userId: payload.sub,
      },
    };
  } catch {
    return null;
  }
}
