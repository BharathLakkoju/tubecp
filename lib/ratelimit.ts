import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/store/redis";

const memoryCounters = new Map<string, { count: number; reset: number }>();

export class RateLimitError extends Error {
  code = "RATE_LIMIT";
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function rateLimitApi(userId: string, action: string, maxPerMinute = 30) {
  const redis = getRedis();
  const key = `rl:${action}:${userId}`;

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
