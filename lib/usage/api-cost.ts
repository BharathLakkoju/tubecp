import { getRedis } from "@/lib/store/redis";
import { indexUsageUser } from "@/lib/usage/admin-aggregate";

type UsageService = "openrouter" | "youtube";

type UsageRecord = {
  openrouterChatTokens: number;
  openrouterEmbeddingInputs: number;
  youtubeQuotaUnits: number;
};

const memoryUsage = new Map<string, UsageRecord>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function usageKey(userId: string, date = todayKey()): string {
  return `usage:${userId}:${date}`;
}

function emptyUsage(): UsageRecord {
  return {
    openrouterChatTokens: 0,
    openrouterEmbeddingInputs: 0,
    youtubeQuotaUnits: 0,
  };
}

async function readUsage(userId: string): Promise<UsageRecord> {
  const redis = getRedis();
  const key = usageKey(userId);

  if (redis) {
    return (await redis.get<UsageRecord>(key)) ?? emptyUsage();
  }

  return memoryUsage.get(key) ?? emptyUsage();
}

async function writeUsage(userId: string, record: UsageRecord): Promise<void> {
  const redis = getRedis();
  const key = usageKey(userId);

  if (redis) {
    await redis.set(key, record, { ex: 8 * 24 * 60 * 60 });
  } else {
    memoryUsage.set(key, record);
  }

  await indexUsageUser(userId);
}

export async function recordOpenRouterChatUsage(
  userId: string | undefined,
  tokens: number
): Promise<void> {
  if (!userId || tokens <= 0) return;

  const usage = await readUsage(userId);
  usage.openrouterChatTokens += tokens;
  await writeUsage(userId, usage);
}

export async function recordOpenRouterEmbeddingUsage(
  userId: string | undefined,
  inputCount: number
): Promise<void> {
  if (!userId || inputCount <= 0) return;

  const usage = await readUsage(userId);
  usage.openrouterEmbeddingInputs += inputCount;
  await writeUsage(userId, usage);
}

export async function recordYouTubeQuotaUsage(
  userId: string | undefined,
  units: number
): Promise<void> {
  if (units <= 0) return;

  if (userId) {
    const usage = await readUsage(userId);
    usage.youtubeQuotaUnits += units;
    await writeUsage(userId, usage);
  }
}

export async function getUserApiUsage(
  userId: string,
  date = todayKey()
): Promise<UsageRecord> {
  const redis = getRedis();
  const key = usageKey(userId, date);

  if (redis) {
    return (await redis.get<UsageRecord>(key)) ?? emptyUsage();
  }

  return memoryUsage.get(key) ?? emptyUsage();
}
