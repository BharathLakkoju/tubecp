import { getRedis } from "@/lib/store/redis";
import { getUserApiUsage } from "@/lib/usage/api-cost";

type UsageRecord = {
  openrouterChatTokens: number;
  openrouterEmbeddingInputs: number;
  youtubeQuotaUnits: number;
};

export type AdminUsageRow = {
  userId: string;
  openrouterChatTokens: number;
  openrouterEmbeddingInputs: number;
  youtubeQuotaUnits: number;
};

export type AdminUsageSummary = {
  date: string;
  totals: UsageRecord;
  users: AdminUsageRow[];
};

const memoryUsageIndex = new Map<string, Set<string>>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function usageIndexKey(date: string): string {
  return `usage-index:${date}`;
}

export async function indexUsageUser(userId: string, date = todayKey()): Promise<void> {
  const redis = getRedis();
  const key = usageIndexKey(date);

  if (redis) {
    await redis.sadd(key, userId);
    await redis.expire(key, 8 * 24 * 60 * 60);
    return;
  }

  const users = memoryUsageIndex.get(key) ?? new Set<string>();
  users.add(userId);
  memoryUsageIndex.set(key, users);
}

async function listIndexedUsageUsers(date: string): Promise<string[]> {
  const redis = getRedis();
  const key = usageIndexKey(date);

  if (redis) {
    const members = await redis.smembers(key);
    return members ?? [];
  }

  return [...(memoryUsageIndex.get(key) ?? new Set<string>())];
}

export async function getAdminUsageSummary(date = todayKey()): Promise<AdminUsageSummary> {
  const userIds = await listIndexedUsageUsers(date);
  const users: AdminUsageRow[] = [];
  const totals: UsageRecord = {
    openrouterChatTokens: 0,
    openrouterEmbeddingInputs: 0,
    youtubeQuotaUnits: 0,
  };

  for (const userId of userIds.sort()) {
    const usage = await getUserApiUsage(userId, date);
    if (
      usage.openrouterChatTokens === 0 &&
      usage.openrouterEmbeddingInputs === 0 &&
      usage.youtubeQuotaUnits === 0
    ) {
      continue;
    }

    users.push({
      userId,
      openrouterChatTokens: usage.openrouterChatTokens,
      openrouterEmbeddingInputs: usage.openrouterEmbeddingInputs,
      youtubeQuotaUnits: usage.youtubeQuotaUnits,
    });

    totals.openrouterChatTokens += usage.openrouterChatTokens;
    totals.openrouterEmbeddingInputs += usage.openrouterEmbeddingInputs;
    totals.youtubeQuotaUnits += usage.youtubeQuotaUnits;
  }

  return { date, totals, users };
}
