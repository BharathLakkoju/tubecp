import { createHash } from "node:crypto";
import { config } from "@/lib/config";
import { getDevMemoryStore } from "@/lib/store/dev-memory";
import { getRedis } from "@/lib/store/redis";

const QUESTION_EMBEDDING_TTL_SECONDS = 24 * 60 * 60;
const MEMORY_STORE_KEY = "__tubecpQuestionEmbeddingCache";

type MemoryEntry = {
  embedding: number[];
  expiresAt: number;
};

function questionEmbeddingKey(model: string, question: string): string {
  const normalized = question.trim();
  const digest = createHash("sha256").update(`${model}\n${normalized}`).digest("hex");
  return `qemb:${model}:${digest}`;
}

function memoryCache(): Map<string, MemoryEntry> {
  const store = getDevMemoryStore();
  let map = store.get(MEMORY_STORE_KEY) as Map<string, MemoryEntry> | undefined;
  if (!map) {
    map = new Map();
    store.set(MEMORY_STORE_KEY, map);
  }
  return map;
}

export async function getCachedQuestionEmbedding(
  question: string,
  model = config.embeddingModel
): Promise<number[] | null> {
  const key = questionEmbeddingKey(model, question);
  const redis = getRedis();
  if (redis) {
    return (await redis.get<number[]>(key)) ?? null;
  }

  const entry = memoryCache().get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache().delete(key);
    return null;
  }
  return entry.embedding;
}

export async function cacheQuestionEmbedding(
  question: string,
  embedding: number[],
  model = config.embeddingModel
): Promise<void> {
  const key = questionEmbeddingKey(model, question);
  const redis = getRedis();
  if (redis) {
    await redis.set(key, embedding, { ex: QUESTION_EMBEDDING_TTL_SECONDS });
    return;
  }

  memoryCache().set(key, {
    embedding,
    expiresAt: Date.now() + QUESTION_EMBEDDING_TTL_SECONDS * 1000,
  });
}

export async function getOrCreateQuestionEmbedding(
  question: string,
  create: () => Promise<number[]>,
  model = config.embeddingModel
): Promise<{ embedding: number[]; cacheHit: boolean }> {
  const cached = await getCachedQuestionEmbedding(question, model);
  if (cached) {
    return { embedding: cached, cacheHit: true };
  }

  const embedding = await create();
  await cacheQuestionEmbedding(question, embedding, model);
  return { embedding, cacheHit: false };
}
