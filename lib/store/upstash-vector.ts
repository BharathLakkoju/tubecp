import { Index } from "@upstash/vector";
import { cosineSimilarity } from "@/lib/services/llm";
import { getDevMemoryStore } from "@/lib/store/dev-memory";
import { hasUpstashVectorCredentials } from "@/lib/store/vector-backend";

export type KbVectorMetadata = {
  videoId: string;
  chunkIndex: number;
  text: string;
  startSec: number;
};

export type StoredKbVector = {
  id: string;
  vector: number[];
  metadata: KbVectorMetadata;
};

export type KbVectorQueryHit = {
  id: string;
  score: number;
  metadata?: KbVectorMetadata;
};

export interface KbVectorIndex {
  upsert(namespace: string, records: StoredKbVector[]): Promise<void>;
  query(namespace: string, vector: number[], topK: number): Promise<KbVectorQueryHit[]>;
  reset(namespace: string): Promise<void>;
  ping(): Promise<boolean>;
}

const MEMORY_STORE_KEY = "__tubecpDevUpstashVector";
const UPSERT_BATCH_SIZE = 100;

type MemoryNamespace = Map<string, StoredKbVector>;

function memoryNamespaces(): Map<string, MemoryNamespace> {
  const store = getDevMemoryStore();
  let map = store.get(MEMORY_STORE_KEY) as Map<string, MemoryNamespace> | undefined;
  if (!map) {
    map = new Map();
    store.set(MEMORY_STORE_KEY, map);
  }
  return map;
}

function memoryNamespace(namespace: string): MemoryNamespace {
  const namespaces = memoryNamespaces();
  let current = namespaces.get(namespace);
  if (!current) {
    current = new Map();
    namespaces.set(namespace, current);
  }
  return current;
}

const memoryIndex: KbVectorIndex = {
  async upsert(namespace, records) {
    const current = memoryNamespace(namespace);
    for (const record of records) {
      current.set(record.id, record);
    }
  },
  async query(namespace, vector, topK) {
    const current = memoryNamespaces().get(namespace);
    if (!current || current.size === 0) return [];
    return [...current.values()]
      .map((record) => ({
        id: record.id,
        score: cosineSimilarity(vector, record.vector),
        metadata: record.metadata,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  },
  async reset(namespace) {
    memoryNamespaces().delete(namespace);
  },
  async ping() {
    return true;
  },
};

let upstashClient: Index<KbVectorMetadata> | null | undefined;

export function getUpstashVectorClient(): Index<KbVectorMetadata> | null {
  if (upstashClient !== undefined) return upstashClient;

  const url = process.env.UPSTASH_VECTOR_REST_URL?.trim();
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN?.trim();
  if (!url || !token) {
    upstashClient = null;
    return null;
  }

  upstashClient = new Index<KbVectorMetadata>({ url, token });
  return upstashClient;
}

function asMetadata(raw: KbVectorMetadata | undefined): KbVectorMetadata | undefined {
  if (!raw) return undefined;
  return {
    videoId: String(raw.videoId ?? ""),
    chunkIndex: Number(raw.chunkIndex ?? 0),
    text: String(raw.text ?? ""),
    startSec: Number(raw.startSec ?? 0),
  };
}

const upstashIndex: KbVectorIndex = {
  async upsert(namespace, records) {
    const client = getUpstashVectorClient();
    if (!client || records.length === 0) return;
    const ns = client.namespace(namespace);
    for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
      const batch = records.slice(i, i + UPSERT_BATCH_SIZE).map((record) => ({
        id: record.id,
        vector: record.vector,
        metadata: record.metadata,
      }));
      await ns.upsert(batch);
    }
  },
  async query(namespace, vector, topK) {
    const client = getUpstashVectorClient();
    if (!client) return [];
    const results = await client.namespace(namespace).query({
      vector,
      topK,
      includeMetadata: true,
    });
    return results.map((result) => ({
      id: String(result.id),
      score: result.score,
      metadata: asMetadata(result.metadata),
    }));
  },
  async reset(namespace) {
    const client = getUpstashVectorClient();
    if (!client) return;
    await client.namespace(namespace).reset();
  },
  async ping() {
    const client = getUpstashVectorClient();
    if (!client) return false;
    try {
      await client.info();
      return true;
    } catch {
      return false;
    }
  },
};

export function getKbVectorIndex(): KbVectorIndex {
  return hasUpstashVectorCredentials() ? upstashIndex : memoryIndex;
}

export async function pingUpstashVector(): Promise<boolean> {
  if (!hasUpstashVectorCredentials()) return false;
  return upstashIndex.ping();
}

export function resetUpstashVectorClientForTests(): void {
  upstashClient = undefined;
  memoryNamespaces().clear();
}
