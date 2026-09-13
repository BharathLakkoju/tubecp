import crypto from "node:crypto";
import { getRedis } from "@/lib/store/redis";

export type McpApiKeyRecord = {
  id: string;
  label: string;
  maskedKey: string;
  createdAt: string;
};

type McpApiKeyMeta = {
  userId: string;
  label: string;
  createdAt: string;
  prefix: string;
  suffix: string;
};

const memoryKeys = new Map<string, string>();
const memoryKeyMeta = new Map<string, McpApiKeyMeta>();
const memoryUserKeyIds = new Map<string, Set<string>>();

function metaKey(hash: string): string {
  return `mcp-key-meta:${hash}`;
}

function userKeysKey(userId: string): string {
  return `mcp-keys:${userId}`;
}

function authKey(hash: string): string {
  return `mcp-key:${hash}`;
}

export function hashMcpKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateMcpApiKey(): string {
  return `tcp_${crypto.randomBytes(24).toString("base64url")}`;
}

export function maskMcpApiKey(rawKey: string): string {
  if (rawKey.length <= 12) {
    return rawKey;
  }
  return `${rawKey.slice(0, 7)}…${rawKey.slice(-4)}`;
}

function buildMeta(userId: string, rawKey: string, label: string): McpApiKeyMeta {
  return {
    userId,
    label,
    createdAt: new Date().toISOString(),
    prefix: rawKey.slice(0, 7),
    suffix: rawKey.slice(-4),
  };
}

function toRecord(hash: string, meta: McpApiKeyMeta): McpApiKeyRecord {
  return {
    id: hash,
    label: meta.label,
    maskedKey: `${meta.prefix}…${meta.suffix}`,
    createdAt: meta.createdAt,
  };
}

export async function storeMcpApiKey(
  userId: string,
  rawKey: string,
  label = "default"
): Promise<McpApiKeyRecord> {
  const hash = hashMcpKey(rawKey);
  const meta = buildMeta(userId, rawKey, label.trim() || "default");
  const redis = getRedis();

  if (redis) {
    await redis.set(authKey(hash), userId, { ex: 60 * 60 * 24 * 365 });
    await redis.set(metaKey(hash), JSON.stringify(meta), { ex: 60 * 60 * 24 * 365 });
    await redis.sadd(userKeysKey(userId), hash);
    return toRecord(hash, meta);
  }

  memoryKeys.set(hash, userId);
  memoryKeyMeta.set(hash, meta);
  const keyIds = memoryUserKeyIds.get(userId) ?? new Set<string>();
  keyIds.add(hash);
  memoryUserKeyIds.set(userId, keyIds);
  return toRecord(hash, meta);
}

export async function listMcpApiKeys(userId: string): Promise<McpApiKeyRecord[]> {
  const redis = getRedis();

  if (redis) {
    const hashes = await redis.smembers(userKeysKey(userId));
    const records: McpApiKeyRecord[] = [];

    for (const hash of hashes) {
      const rawMeta = await redis.get<string>(metaKey(hash));
      if (!rawMeta) {
        continue;
      }

      try {
        records.push(toRecord(hash, JSON.parse(rawMeta) as McpApiKeyMeta));
      } catch {
        // Skip malformed metadata.
      }
    }

    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const keyIds = memoryUserKeyIds.get(userId);
  if (!keyIds) {
    return [];
  }

  return [...keyIds]
    .map((hash) => {
      const meta = memoryKeyMeta.get(hash);
      return meta ? toRecord(hash, meta) : null;
    })
    .filter((record): record is McpApiKeyRecord => record !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeMcpApiKey(userId: string, rawKey: string): Promise<void> {
  const hash = hashMcpKey(rawKey);
  await revokeMcpApiKeyById(userId, hash);
}

export async function revokeMcpApiKeyById(userId: string, keyId: string): Promise<boolean> {
  const redis = getRedis();

  if (redis) {
    const owner = await redis.get<string>(authKey(keyId));
    if (owner !== userId) {
      return false;
    }

    await redis.del(authKey(keyId));
    await redis.del(metaKey(keyId));
    await redis.srem(userKeysKey(userId), keyId);
    return true;
  }

  if (memoryKeys.get(keyId) !== userId) {
    return false;
  }

  memoryKeys.delete(keyId);
  memoryKeyMeta.delete(keyId);
  const keyIds = memoryUserKeyIds.get(userId);
  keyIds?.delete(keyId);
  return true;
}

export async function revokeAllMcpApiKeys(userId: string): Promise<void> {
  const redis = getRedis();

  if (redis) {
    const hashes = await redis.smembers(userKeysKey(userId));
    if (hashes.length > 0) {
      await Promise.all(
        hashes.flatMap((hash) => [redis.del(authKey(hash)), redis.del(metaKey(hash))])
      );
    }
    await redis.del(userKeysKey(userId));
    return;
  }

  const keyIds = memoryUserKeyIds.get(userId);
  if (!keyIds) {
    return;
  }

  for (const hash of keyIds) {
    memoryKeys.delete(hash);
    memoryKeyMeta.delete(hash);
  }
  memoryUserKeyIds.delete(userId);
}

export async function resolveMcpApiKey(rawKey: string): Promise<{ userId: string } | null> {
  const hash = hashMcpKey(rawKey);
  const redis = getRedis();

  if (redis) {
    const userId = await redis.get<string>(authKey(hash));
    return userId ? { userId } : null;
  }

  const userId = memoryKeys.get(hash);
  return userId ? { userId } : null;
}
