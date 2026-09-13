import type { ResearchResult, Transcript, TranscriptChunk, KnowledgeBaseRecord } from "./types";
import { getRedis, hasRedis } from "./store/redis";

const memory = new Map<string, unknown>();
const RESEARCH_RESULT_TTL_SECONDS = 48 * 60 * 60;
/** Upstash Redis limits each request to 10MB — batch mget to stay under. */
const MGET_BATCH_SIZE = 24;

export type ChunkContent = Pick<
  TranscriptChunk,
  "id" | "videoId" | "title" | "channel" | "timestamp" | "text"
>;

function chunkContentKey(chunkId: string): string {
  return `chunk-content:${chunkId}`;
}

export function hasKv(): boolean {
  return hasRedis();
}

async function get<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    return (await redis.get<T>(key)) ?? null;
  }
  return (memory.get(key) as T) ?? null;
}

async function mget<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];

  const redis = getRedis();
  if (redis) {
    const results: (T | null)[] = [];

    for (let i = 0; i < keys.length; i += MGET_BATCH_SIZE) {
      const batch = keys.slice(i, i + MGET_BATCH_SIZE);
      const values = await redis.mget<(T | null)[]>(...batch);
      results.push(...values.map((value) => value ?? null));
    }

    return results;
  }

  return keys.map((key) => (memory.get(key) as T) ?? null);
}

async function set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    if (ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
    return;
  }
  memory.set(key, value);
}

async function del(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  memory.delete(key);
}

export function hashTopic(topic: string): string {
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = (hash << 5) - hash + topic.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export async function getCachedTranscript(videoId: string): Promise<Transcript | null> {
  return get<Transcript>(`transcript:${videoId}`);
}

export async function cacheTranscript(transcript: Transcript): Promise<void> {
  await set(`transcript:${transcript.videoId}`, transcript);
}

export async function getCachedQueries(
  topicHash: string
): Promise<{ queries: string[]; videoIds: string[]; cachedAt: string } | null> {
  const cached = await get<{ queries: string[]; videoIds: string[]; cachedAt: string }>(
    `queries:${topicHash}`
  );
  if (!cached) return null;

  const ageHours = (Date.now() - new Date(cached.cachedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours > 48) return null;

  return cached;
}

export async function cacheQueries(
  topicHash: string,
  queries: string[],
  videoIds: string[]
): Promise<void> {
  await set(
    `queries:${topicHash}`,
    { queries, videoIds, cachedAt: new Date().toISOString() },
    48 * 60 * 60
  );
}

export async function getCachedExpandedQueries(topicHash: string): Promise<string[] | null> {
  return get<string[]>(`expanded:${topicHash}`);
}

export async function cacheExpandedQueries(topicHash: string, queries: string[]): Promise<void> {
  await set(`expanded:${topicHash}`, queries, 48 * 60 * 60);
}

export async function getCachedAnalysis(
  topicHash: string,
  videoId: string
): Promise<import("./types").VideoAnalysis | null> {
  return get<import("./types").VideoAnalysis>(`analysis:${topicHash}:${videoId}`);
}

export async function cacheAnalysis(
  topicHash: string,
  videoId: string,
  analysis: import("./types").VideoAnalysis
): Promise<void> {
  await set(`analysis:${topicHash}:${videoId}`, analysis, 7 * 24 * 60 * 60);
}

export async function saveChunk(chunk: TranscriptChunk): Promise<void> {
  const { embedding: _embedding, ...content } = chunk;
  await Promise.all([
    set(`chunk:${chunk.id}`, chunk),
    set(chunkContentKey(chunk.id), content),
  ]);
}

export async function getChunksForVideos(videoIds: string[]): Promise<TranscriptChunk[]> {
  if (videoIds.length === 0) return [];

  const chunkListKeys = videoIds.map((videoId) => `video-chunks:${videoId}`);
  const chunkLists = await mget<string[]>(chunkListKeys);
  const chunkIds = [
    ...new Set(chunkLists.flatMap((ids) => ids ?? [])),
  ];

  return getChunksByIds(chunkIds);
}

export async function getChunksByIds(chunkIds: string[]): Promise<TranscriptChunk[]> {
  if (chunkIds.length === 0) return [];

  const keys = chunkIds.map((id) => `chunk:${id}`);
  const chunks = await mget<TranscriptChunk>(keys);
  return chunks.filter((chunk): chunk is TranscriptChunk => chunk !== null);
}

/** Text-only chunk payload for RAG context — avoids loading embeddings from Redis. */
export async function getChunkContentsByIds(chunkIds: string[]): Promise<ChunkContent[]> {
  if (chunkIds.length === 0) return [];

  const contentKeys = chunkIds.map((id) => chunkContentKey(id));
  const contents = await mget<ChunkContent>(contentKeys);
  const resolved: ChunkContent[] = [];
  const missingIds: string[] = [];

  for (let i = 0; i < chunkIds.length; i++) {
    const content = contents[i];
    if (content) {
      resolved.push(content);
      continue;
    }
    missingIds.push(chunkIds[i]);
  }

  if (missingIds.length > 0) {
    const legacyChunks = await getChunksByIds(missingIds);
    for (const chunk of legacyChunks) {
      const { embedding: _embedding, ...content } = chunk;
      resolved.push(content);
      await set(chunkContentKey(chunk.id), content);
    }
  }

  const order = new Map(chunkIds.map((id, index) => [id, index]));
  return resolved.sort(
    (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

export function researchResultCacheKey(planId: string, topic: string): string {
  return `research-result:${planId}:${hashTopic(topic.toLowerCase().trim())}`;
}

export async function getCachedResearchResult(
  cacheKey: string
): Promise<ResearchResult | null> {
  const cached = await get<{ result: ResearchResult; cachedAt: string }>(cacheKey);
  if (!cached) return null;

  const ageHours = (Date.now() - new Date(cached.cachedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours > 48) return null;

  return cached.result;
}

export async function cacheResearchResult(
  cacheKey: string,
  result: ResearchResult
): Promise<void> {
  await set(
    cacheKey,
    { result, cachedAt: new Date().toISOString() },
    RESEARCH_RESULT_TTL_SECONDS
  );
}

export async function registerVideoChunks(videoId: string, chunkIds: string[]): Promise<void> {
  const existing = (await get<string[]>(`video-chunks:${videoId}`)) ?? [];
  const merged = [...new Set([...existing, ...chunkIds])];
  await set(`video-chunks:${videoId}`, merged);
}

function kbTtl(persistent: boolean): number | undefined {
  return persistent ? undefined : 72 * 60 * 60;
}

export async function saveKnowledgeBase(
  kb: KnowledgeBaseRecord,
  persistent = false
): Promise<void> {
  await set(`kb:${kb.kbId}`, kb, kbTtl(persistent));
}

export async function getKnowledgeBase(kbId: string): Promise<KnowledgeBaseRecord | null> {
  return get<KnowledgeBaseRecord>(`kb:${kbId}`);
}

export async function updateKnowledgeBase(
  kbId: string,
  updater: (kb: KnowledgeBaseRecord) => KnowledgeBaseRecord,
  persistent = false
): Promise<KnowledgeBaseRecord | null> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) return null;
  const updated = updater(kb);
  await saveKnowledgeBase(updated, persistent);
  return updated;
}

export async function addUserKnowledgeBase(userId: string, kbId: string): Promise<void> {
  const key = `user-kbs:${userId}`;
  const existing = (await get<string[]>(key)) ?? [];
  if (!existing.includes(kbId)) {
    await set(key, [kbId, ...existing].slice(0, 100));
  }
}

export async function removeUserKnowledgeBase(userId: string, kbId: string): Promise<void> {
  const key = `user-kbs:${userId}`;
  const existing = (await get<string[]>(key)) ?? [];
  await set(key, existing.filter((id) => id !== kbId));
}

export async function deleteKnowledgeBaseRecord(kbId: string): Promise<void> {
  await del(`kb:${kbId}`);
}

export async function deleteChunksForKnowledgeBase(
  videoIds: string[],
  chunkIds: string[]
): Promise<void> {
  const chunkSet = new Set(chunkIds);

  for (const videoId of videoIds) {
    const ids = await get<string[]>(`video-chunks:${videoId}`);
    if (!ids) continue;

    const next = ids.filter((id) => !chunkSet.has(id));
    if (next.length === 0) {
      await del(`video-chunks:${videoId}`);
    } else {
      await set(`video-chunks:${videoId}`, next);
    }
  }

  for (const chunkId of chunkIds) {
    await del(`chunk:${chunkId}`);
    await del(chunkContentKey(chunkId));
  }
}

export async function getUserKnowledgeBases(userId: string): Promise<string[]> {
  return (await get<string[]>(`user-kbs:${userId}`)) ?? [];
}

export async function listUserKnowledgeBaseRecords(
  userId: string
): Promise<KnowledgeBaseRecord[]> {
  const ids = await getUserKnowledgeBases(userId);
  if (ids.length === 0) return [];

  const records = await mget<KnowledgeBaseRecord>(ids.map((kbId) => `kb:${kbId}`));
  return records.filter((kb): kb is KnowledgeBaseRecord => kb !== null && kb.userId === userId);
}
