import type { Transcript, TranscriptChunk, KnowledgeBaseRecord } from "./types";
import { getRedis, hasRedis } from "./store/redis";

const memory = new Map<string, unknown>();

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
  await set(`chunk:${chunk.id}`, chunk);
}

export async function getChunksForVideos(videoIds: string[]): Promise<TranscriptChunk[]> {
  const chunks: TranscriptChunk[] = [];
  for (const videoId of videoIds) {
    const ids = await get<string[]>(`video-chunks:${videoId}`);
    if (!ids) continue;
    for (const id of ids) {
      const chunk = await get<TranscriptChunk>(`chunk:${id}`);
      if (chunk) chunks.push(chunk);
    }
  }
  return chunks;
}

export async function getChunksByIds(chunkIds: string[]): Promise<TranscriptChunk[]> {
  const chunks: TranscriptChunk[] = [];
  for (const id of chunkIds) {
    const chunk = await get<TranscriptChunk>(`chunk:${id}`);
    if (chunk) chunks.push(chunk);
  }
  return chunks;
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

export async function getUserKnowledgeBases(userId: string): Promise<string[]> {
  return (await get<string[]>(`user-kbs:${userId}`)) ?? [];
}
