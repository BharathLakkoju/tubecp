import { cosineSimilarity } from "@/lib/services/llm";
import { getDevMemoryStore } from "@/lib/store/dev-memory";
import { getRedis } from "@/lib/store/redis";

export type KbVectorEntry = {
  id: string;
  embedding: number[];
};

const IVF_BUCKET_BITS = 8;
const IVF_BUCKET_COUNT = 1 << IVF_BUCKET_BITS;
const IVF_FULL_SCAN_THRESHOLD = 48;

const FLAT_INDEX_KEY = "__tubecpDevVectorFlat";
const BUCKET_INDEX_KEY = "__tubecpDevVectorBuckets";

function devFlatIndexes(): Map<string, KbVectorEntry[]> {
  const store = getDevMemoryStore();
  let map = store.get(FLAT_INDEX_KEY) as Map<string, KbVectorEntry[]> | undefined;
  if (!map) {
    map = new Map();
    store.set(FLAT_INDEX_KEY, map);
  }
  return map;
}

function devBucketIndexes(): Map<string, Map<number, KbVectorEntry[]>> {
  const store = getDevMemoryStore();
  let map = store.get(BUCKET_INDEX_KEY) as Map<string, Map<number, KbVectorEntry[]>> | undefined;
  if (!map) {
    map = new Map();
    store.set(BUCKET_INDEX_KEY, map);
  }
  return map;
}

function indexKey(kbId: string): string {
  return `kb-vidx:${kbId}`;
}

/** Legacy monolithic bucket blob — migrated to per-bucket keys on write. */
function legacyBucketIndexKey(kbId: string): string {
  return `kb-vidx-ivf:${kbId}`;
}

function perBucketIndexKey(kbId: string, bucket: number): string {
  return `kb-vidx-ivf:${kbId}:b${bucket}`;
}

function bucketManifestKey(kbId: string): string {
  return `kb-vidx-ivf:${kbId}:manifest`;
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
  return devFlatIndexes().get(kbId) ?? [];
}

async function writeFlatIndex(kbId: string, entries: KbVectorEntry[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(indexKey(kbId), entries);
    return;
  }
  devFlatIndexes().set(kbId, entries);
}

async function readLegacyRedisBucketIndex(kbId: string): Promise<Map<number, KbVectorEntry[]> | null> {
  const redis = getRedis();
  if (!redis) return null;

  const record = await redis.get<Record<string, KbVectorEntry[]>>(legacyBucketIndexKey(kbId));
  if (!record) return null;
  return recordToBuckets(record);
}

async function readBucketManifest(kbId: string): Promise<number[]> {
  const redis = getRedis();
  if (!redis) return [];

  const manifest = await redis.get<number[]>(bucketManifestKey(kbId));
  return manifest ?? [];
}

async function writeBucketManifest(kbId: string, buckets: number[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(bucketManifestKey(kbId), [...new Set(buckets)].sort((a, b) => a - b));
}

async function readRedisBucketEntries(kbId: string, bucket: number): Promise<KbVectorEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  return (await redis.get<KbVectorEntry[]>(perBucketIndexKey(kbId, bucket))) ?? [];
}

async function writeRedisBucketEntries(
  kbId: string,
  bucket: number,
  entries: KbVectorEntry[]
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(perBucketIndexKey(kbId, bucket), entries);
}

async function readBucketIndex(kbId: string): Promise<Map<number, KbVectorEntry[]>> {
  const redis = getRedis();
  if (!redis) {
    return devBucketIndexes().get(kbId) ?? new Map();
  }

  const manifest = await readBucketManifest(kbId);
  if (manifest.length > 0) {
    const buckets = new Map<number, KbVectorEntry[]>();
    for (const bucket of manifest) {
      const entries = await readRedisBucketEntries(kbId, bucket);
      if (entries.length > 0) buckets.set(bucket, entries);
    }
    return buckets;
  }

  const legacy = await readLegacyRedisBucketIndex(kbId);
  return legacy ?? new Map();
}

async function writeBucketIndex(
  kbId: string,
  buckets: Map<number, KbVectorEntry[]>
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    devBucketIndexes().set(kbId, buckets);
    return;
  }

  const manifest: number[] = [];
  for (const [bucket, entries] of buckets.entries()) {
    await writeRedisBucketEntries(kbId, bucket, entries);
    manifest.push(bucket);
  }
  await writeBucketManifest(kbId, manifest);
  await redis.del(legacyBucketIndexKey(kbId));
}

async function appendToRedisBuckets(kbId: string, entries: KbVectorEntry[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const manifest = new Set(await readBucketManifest(kbId));
  const legacy = manifest.size === 0 ? await readLegacyRedisBucketIndex(kbId) : null;
  if (legacy) {
    for (const [bucket, bucketEntries] of legacy.entries()) {
      await writeRedisBucketEntries(kbId, bucket, bucketEntries);
      manifest.add(bucket);
    }
    await redis.del(legacyBucketIndexKey(kbId));
  }

  const touched = new Set<number>();
  for (const entry of entries) {
    const bucket = embeddingBucket(entry.embedding);
    touched.add(bucket);
    const current =
      manifest.has(bucket) || legacy?.has(bucket)
        ? await readRedisBucketEntries(kbId, bucket)
        : [];
    const merged = mergeEntries(current, [entry]);
    await writeRedisBucketEntries(kbId, bucket, merged);
    manifest.add(bucket);
  }

  await writeBucketManifest(kbId, [...manifest]);
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

  const redis = getRedis();
  if (redis) {
    await appendToRedisBuckets(kbId, entries);
    return;
  }

  await writeBucketIndex(kbId, addToBucketMap(await readBucketIndex(kbId), entries));
}

function flattenBucketIndex(buckets: Map<number, KbVectorEntry[]>): KbVectorEntry[] {
  const entries: KbVectorEntry[] = [];
  const seen = new Set<string>();

  for (const bucketEntries of buckets.values()) {
    for (const entry of bucketEntries) {
      if (!seen.has(entry.id)) {
        entries.push(entry);
        seen.add(entry.id);
      }
    }
  }

  return entries;
}

async function readProbeBucketEntries(
  kbId: string,
  probes: number[],
  manifest: number[]
): Promise<KbVectorEntry[]> {
  const redis = getRedis();
  if (!redis) {
    const buckets = await readBucketIndex(kbId);
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
    return candidates;
  }

  const probeSet = new Set(probes);
  const bucketsToRead = manifest.filter((bucket) => probeSet.has(bucket));
  const candidates: KbVectorEntry[] = [];
  const seen = new Set<string>();
  for (const bucket of bucketsToRead) {
    for (const entry of await readRedisBucketEntries(kbId, bucket)) {
      if (!seen.has(entry.id)) {
        candidates.push(entry);
        seen.add(entry.id);
      }
    }
  }
  return candidates;
}

export async function searchKbVectorIndex(
  kbId: string,
  queryEmbedding: number[],
  topK: number
): Promise<Array<{ id: string; score: number }>> {
  const buckets = await readBucketIndex(kbId);
  let entries = flattenBucketIndex(buckets);

  if (entries.length === 0) {
    entries = await readFlatIndex(kbId);
  }

  if (entries.length === 0) return [];

  if (entries.length <= IVF_FULL_SCAN_THRESHOLD) {
    return scoreEntries(entries, queryEmbedding, topK);
  }

  const probes = probeBuckets(queryEmbedding);
  const manifest =
    getRedis() ? await readBucketManifest(kbId) : [...buckets.keys()];
  const candidates = await readProbeBucketEntries(kbId, probes, manifest);

  if (candidates.length === 0) {
    return scoreEntries(entries, queryEmbedding, topK);
  }

  return scoreEntries(candidates, queryEmbedding, topK);
}

export async function deleteKbVectorIndex(kbId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const manifest = await readBucketManifest(kbId);
    if (manifest.length > 0) {
      const keys = manifest.map((bucket) => perBucketIndexKey(kbId, bucket));
      await redis.del(...keys, bucketManifestKey(kbId));
    }
    await redis.del(indexKey(kbId));
    await redis.del(legacyBucketIndexKey(kbId));
    return;
  }
  devFlatIndexes().delete(kbId);
  devBucketIndexes().delete(kbId);
}
