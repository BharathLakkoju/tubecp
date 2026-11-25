import { isProduction } from "@/lib/env";

export type ChatVectorBackend = "upstash" | "redis";

export function hasUpstashVectorCredentials(): boolean {
  return Boolean(
    process.env.UPSTASH_VECTOR_REST_URL?.trim() &&
      process.env.UPSTASH_VECTOR_REST_TOKEN?.trim()
  );
}

export function chatVectorBackend(): ChatVectorBackend {
  return process.env.CHAT_VECTOR_BACKEND === "redis" ? "redis" : "upstash";
}

/**
 * Redis IVF is the rollback index. Writes stay off unless rollback is on,
 * dual-write is requested, or production has no Upstash Vector credentials.
 */
export function redisVectorIndexWritesEnabled(): boolean {
  if (process.env.REDIS_VECTOR_INDEX_WRITES === "true") return true;
  if (chatVectorBackend() === "redis") return true;
  return isProduction() && !hasUpstashVectorCredentials();
}

/** Search target for chat. Falls back to Redis IVF in production without Vector credentials. */
export function resolveChatVectorBackend(): ChatVectorBackend {
  if (chatVectorBackend() === "redis") return "redis";
  if (hasUpstashVectorCredentials() || !isProduction()) return "upstash";
  return "redis";
}
