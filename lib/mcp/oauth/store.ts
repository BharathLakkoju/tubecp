import crypto from "node:crypto";
import { getRedis, readStoredValue } from "@/lib/store/redis";

export type McpAuthorizationRecord = {
  userId: string;
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  scopes: string[];
  resource?: string;
};

export type McpRefreshRecord = {
  userId: string;
  clientId: string;
  scopes: string[];
};

const memoryAuthCodes = new Map<string, McpAuthorizationRecord>();
const memoryRefreshTokens = new Map<string, McpRefreshRecord>();

function authCodeKey(code: string): string {
  return `mcp-oauth-code:${code}`;
}

function refreshKey(token: string): string {
  return `mcp-oauth-refresh:${token}`;
}

export async function storeAuthorizationCode(
  record: McpAuthorizationRecord
): Promise<string> {
  const code = crypto.randomBytes(24).toString("base64url");
  const redis = getRedis();

  if (redis) {
    await redis.set(authCodeKey(code), record, { ex: 600 });
    return code;
  }

  memoryAuthCodes.set(code, record);
  return code;
}

export async function consumeAuthorizationCode(
  code: string
): Promise<McpAuthorizationRecord | null> {
  const redis = getRedis();

  if (redis) {
    const raw = await redis.get(authCodeKey(code));
    const record = readStoredValue<McpAuthorizationRecord>(raw);
    if (!record) {
      return null;
    }
    await redis.del(authCodeKey(code));
    return record;
  }

  const record = memoryAuthCodes.get(code) ?? null;
  memoryAuthCodes.delete(code);
  return record;
}

export async function storeRefreshToken(record: McpRefreshRecord): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const redis = getRedis();

  if (redis) {
    await redis.set(refreshKey(token), record, {
      ex: 60 * 60 * 24 * 90,
    });
    return token;
  }

  memoryRefreshTokens.set(token, record);
  return token;
}

export async function consumeRefreshToken(
  token: string
): Promise<McpRefreshRecord | null> {
  const redis = getRedis();

  if (redis) {
    const raw = await redis.get(refreshKey(token));
    const record = readStoredValue<McpRefreshRecord>(raw);
    if (!record) {
      return null;
    }
    await redis.del(refreshKey(token));
    return record;
  }

  const record = memoryRefreshTokens.get(token) ?? null;
  memoryRefreshTokens.delete(token);
  return record;
}

export async function getAuthorizationCodeChallenge(code: string): Promise<string | null> {
  const redis = getRedis();

  if (redis) {
    const raw = await redis.get(authCodeKey(code));
    return readStoredValue<McpAuthorizationRecord>(raw)?.codeChallenge ?? null;
  }

  return memoryAuthCodes.get(code)?.codeChallenge ?? null;
}
