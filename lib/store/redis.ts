import { Redis } from "@upstash/redis";

let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    redis = null;
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

export function hasRedis(): boolean {
  return getRedis() !== null;
}

/** Upstash may return either a JSON string or an already-parsed object. */
export function readStoredValue<T>(raw: unknown): T | null {
  if (raw == null) {
    return null;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  return raw as T;
}
