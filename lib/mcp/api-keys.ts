import crypto from "node:crypto";
import { getRedis } from "@/lib/store/redis";

const memoryKeys = new Map<string, string>();

export function hashMcpKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateMcpApiKey(): string {
  return `tcp_${crypto.randomBytes(24).toString("base64url")}`;
}

export async function storeMcpApiKey(userId: string, rawKey: string): Promise<void> {
  const hash = hashMcpKey(rawKey);
  const redis = getRedis();

  if (redis) {
    await redis.set(`mcp-key:${hash}`, userId, { ex: 60 * 60 * 24 * 365 });
    await redis.sadd(`mcp-keys:${userId}`, hash);
    return;
  }

  memoryKeys.set(hash, userId);
}

export async function revokeMcpApiKey(userId: string, rawKey: string): Promise<void> {
  const hash = hashMcpKey(rawKey);
  const redis = getRedis();

  if (redis) {
    await redis.del(`mcp-key:${hash}`);
    await redis.srem(`mcp-keys:${userId}`, hash);
    return;
  }

  memoryKeys.delete(hash);
}

export async function revokeAllMcpApiKeys(userId: string): Promise<void> {
  const redis = getRedis();

  if (redis) {
    const hashes = await redis.smembers(`mcp-keys:${userId}`);
    if (hashes.length > 0) {
      await Promise.all(hashes.map((hash) => redis.del(`mcp-key:${hash}`)));
    }
    await redis.del(`mcp-keys:${userId}`);
    return;
  }

  for (const [hash, owner] of memoryKeys.entries()) {
    if (owner === userId) {
      memoryKeys.delete(hash);
    }
  }
}

export async function resolveMcpApiKey(rawKey: string): Promise<{ userId: string } | null> {
  const hash = hashMcpKey(rawKey);
  const redis = getRedis();

  if (redis) {
    const userId = await redis.get<string>(`mcp-key:${hash}`);
    return userId ? { userId } : null;
  }

  const userId = memoryKeys.get(hash);
  return userId ? { userId } : null;
}
