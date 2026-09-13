import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { isProduction } from "@/lib/env";
import { getRedis } from "@/lib/store/redis";

const memoryCounters = new Map<string, { count: number; reset: number }>();

export class RateLimitError extends Error {
  code = "RATE_LIMIT";
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function rateLimitByIp(
  request: NextRequest,
  action: string,
  maxPerMinute = 30
): Promise<void> {
  await rateLimitApi(clientIp(request), action, maxPerMinute);
}

export async function rateLimitApi(userId: string, action: string, maxPerMinute = 30) {
  const redis = getRedis();
  const key = `rl:${action}:${userId}`;

  if (!redis && isProduction()) {
    throw new RateLimitError("Service temporarily unavailable. Please try again later.");
  }

  if (redis) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxPerMinute, "1 m"),
      prefix: "yt-research",
    });
    const result = await limiter.limit(key);
    if (!result.success) {
      throw new RateLimitError("Too many requests. Please slow down.");
    }
    return;
  }

  const now = Date.now();
  const entry = memoryCounters.get(key);
  if (!entry || now > entry.reset) {
    memoryCounters.set(key, { count: 1, reset: now + 60_000 });
    return;
  }
  entry.count += 1;
  if (entry.count > maxPerMinute) {
    throw new RateLimitError("Too many requests. Please slow down.");
  }
}
