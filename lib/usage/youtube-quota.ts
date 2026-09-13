import { getRedis } from "@/lib/store/redis";

const DEFAULT_DAILY_LIMIT = 10_000;
const WARNING_THRESHOLD = 0.8;

const memoryGlobalQuota = new Map<string, number>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function globalQuotaKey(date = todayKey()): string {
  return `youtube:quota:${date}`;
}

export function getYouTubeDailyQuotaLimit(): number {
  const configured = Number(process.env.YOUTUBE_DAILY_QUOTA_LIMIT ?? DEFAULT_DAILY_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_DAILY_LIMIT;
}

export async function incrementYouTubeQuota(units: number): Promise<number> {
  if (units <= 0) return 0;

  const redis = getRedis();
  const key = globalQuotaKey();

  if (redis) {
    const total = await redis.incrby(key, units);
    await redis.expire(key, 8 * 24 * 60 * 60);

    const limit = getYouTubeDailyQuotaLimit();
    if (total / limit >= WARNING_THRESHOLD) {
      console.warn(
        `[youtube-quota] Daily usage at ${total}/${limit} units (${Math.round((total / limit) * 100)}%)`
      );
    }

    return total;
  }

  const total = (memoryGlobalQuota.get(key) ?? 0) + units;
  memoryGlobalQuota.set(key, total);
  return total;
}

export async function getYouTubeQuotaUsage(date = todayKey()): Promise<{
  used: number;
  limit: number;
  warning: boolean;
}> {
  const redis = getRedis();
  const key = globalQuotaKey(date);
  const limit = getYouTubeDailyQuotaLimit();

  const used = redis
    ? Number(await redis.get<number>(key)) || 0
    : memoryGlobalQuota.get(key) ?? 0;

  return {
    used,
    limit,
    warning: used / limit >= WARNING_THRESHOLD,
  };
}
