import { cosineSimilarity } from "@/lib/services/llm";
import { getRedis } from "@/lib/store/redis";

export type KbVectorEntry = {
  id: string;
  embedding: number[];
};

const IVF_BUCKET_BITS = 8;
const IVF_BUCKET_COUNT = 1 << IVF_BUCKET_BITS;
const IVF_FULL_SCAN_THRESHOLD = 48;

const memoryIndexes = new Map<string, KbVectorEntry[]>();
const memoryBucketIndexes = new Map<string, Map<number, KbVectorEntry[]>>();

function indexKey(kbId: string): string {
  return `kb-vidx:${kbId}`;
}

function bucketIndexKey(kbId: string): string {
  return `kb-vidx-ivf:${kbId}`;
}

function embeddingBucket(embedding: number[]): number {
  let bucket = 0;
  for (let i = 0; i < IVF_BUCKET_BITS && i < embedding.length; i++) {
    bucket = (bucket << 1) | (embedding[i] >= 0 ? 1 : 0);
  }
  return bucket & (IVF_BUCKET_COUNT - 1);
}

function probeBuckets(queryEmbedding: number[]): number[] {
  const base = embeddingBucket(queryEmbedding);
  const probes = new Set<number>([base]);

  for (let bit = 0; bit < IVF_BUCKET_BITS; bit++) {
    probes.add(base ^ (1 << bit));
  }

  return [...probes];
}

function mergeEntries(existing: KbVectorEntry[], incoming: KbVectorEntry[]): KbVectorEntry[] {
  const seen = new Set(existing.map((entry) => entry.id));
  const merged = [...existing];

  for (const entry of incoming) {
    if (!seen.has(entry.id)) {
      merged.push(entry);
      seen.add(entry.id);
    }
  }

  return merged;
}

function addToBucketMap(
  buckets: Map<number, KbVectorEntry[]>,
  entries: KbVectorEntry[]
): Map<number, KbVectorEntry[]> {
  for (const entry of entries) {
    const bucket = embeddingBucket(entry.embedding);
    const current = buckets.get(bucket) ?? [];
    if (!current.some((item) => item.id === entry.id)) {
      buckets.set(bucket, [...current, entry]);
    }
  }
  return buckets;
}

function bucketsToRecord(buckets: Map<number, KbVectorEntry[]>): Record<string, KbVectorEntry[]> {
  const record: Record<string, KbVectorEntry[]> = {};
  for (const [bucket, entries] of buckets.entries()) {
    record[String(bucket)] = entries;
  }
  return record;
}

function recordToBuckets(record: Record<string, KbVectorEntry[]>): Map<number, KbVectorEntry[]> {
  const buckets = new Map<number, KbVectorEntry[]>();
  for (const [bucket, entries] of Object.entries(record)) {
    buckets.set(Number(bucket), entries);
  }
  return buckets;
}

async function readFlatIndex(kbId: string): Promise<KbVectorEntry[]> {
  const redis = getRedis();
  if (redis) {
    return (await redis.get<KbVectorEntry[]>(indexKey(kbId))) ?? [];
  }
  return memoryIndexes.get(kbId) ?? [];
}

async function writeFlatIndex(kbId: string, entries: KbVectorEntry[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(indexKey(kbId), entries);
    return;
  }
  memoryIndexes.set(kbId, entries);
}

async function readBucketIndex(kbId: string): Promise<Map<number, KbVectorEntry[]>> {
  const redis = getRedis();
  if (redis) {
    const record = await redis.get<Record<string, KbVectorEntry[]>>(bucketIndexKey(kbId));
    return record ? recordToBuckets(record) : new Map();
  }
  return memoryBucketIndexes.get(kbId) ?? new Map();
}

async function writeBucketIndex(
  kbId: string,
  buckets: Map<number, KbVectorEntry[]>
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(bucketIndexKey(kbId), bucketsToRecord(buckets));
    return;
  }
  memoryBucketIndexes.set(kbId, buckets);
}

function scoreEntries(
  entries: KbVectorEntry[],
  queryEmbedding: number[],
  topK: number
): Array<{ id: string; score: number }> {
  return entries
    .map((entry) => ({
      id: entry.id,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function setKbVectorIndex(kbId: string, entries: KbVectorEntry[]): Promise<void> {
  await writeFlatIndex(kbId, entries);
  await writeBucketIndex(kbId, addToBucketMap(new Map(), entries));
}

export async function addToKbVectorIndex(
  kbId: string,
  entries: KbVectorEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  const merged = mergeEntries(await readFlatIndex(kbId), entries);
  await writeFlatIndex(kbId, merged);
  await writeBucketIndex(kbId, addToBucketMap(await readBucketIndex(kbId), entries));
}

export async function searchKbVectorIndex(
  kbId: string,
  queryEmbedding: number[],
  topK: number
): Promise<Array<{ id: string; score: number }>> {
  const entries = await readFlatIndex(kbId);
  if (entries.length === 0) return [];

  if (entries.length <= IVF_FULL_SCAN_THRESHOLD) {
    return scoreEntries(entries, queryEmbedding, topK);
  }

  const buckets = await readBucketIndex(kbId);
  const probes = probeBuckets(queryEmbedding);
  const candidates: KbVectorEntry[] = [];
  const seen = new Set<string>();

  for (const bucket of probes) {
    for (const entry of buckets.get(bucket) ?? []) {
      if (!seen.has(entry.id)) {
        candidates.push(entry);
        seen.add(entry.id);
      }
    }
  }

  if (candidates.length === 0) {
    return scoreEntries(entries, queryEmbedding, topK);
  }

  return scoreEntries(candidates, queryEmbedding, topK);
}

export async function deleteKbVectorIndex(kbId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(indexKey(kbId));
    await redis.del(bucketIndexKey(kbId));
    return;
  }
  memoryIndexes.delete(kbId);
  memoryBucketIndexes.delete(kbId);
}
