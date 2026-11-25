import type { TranscriptChunk } from "@/lib/types";
import {
  getKbVectorIndex,
  type KbVectorMetadata,
  type KbVectorQueryHit,
  type StoredKbVector,
} from "@/lib/store/upstash-vector";
import {
  addToKbVectorIndex,
  deleteKbVectorIndex,
  searchKbVectorIndex,
} from "@/lib/store/vector-index";
import {
  redisVectorIndexWritesEnabled,
  resolveChatVectorBackend,
} from "@/lib/store/vector-backend";

export type KbVectorRecord = {
  id: string;
  embedding: number[];
  videoId: string;
  text: string;
  startSec: number;
  chunkIndex?: number;
};

export type KbVectorHit = {
  id: string;
  score: number;
  videoId?: string;
  chunkIndex?: number;
  text?: string;
  startSec?: number;
};

export function chunkIndexFromId(chunkId: string): number {
  const last = chunkId.split(":").pop();
  const parsed = Number(last);
  return Number.isInteger(parsed) ? parsed : 0;
}

export function kbVectorRecordFromChunk(chunk: TranscriptChunk): KbVectorRecord | null {
  if (!chunk.embedding) return null;
  return {
    id: chunk.id,
    embedding: chunk.embedding,
    videoId: chunk.videoId,
    text: chunk.text,
    startSec: chunk.timestamp,
    chunkIndex: chunkIndexFromId(chunk.id),
  };
}

function toStoredVector(record: KbVectorRecord): StoredKbVector {
  const metadata: KbVectorMetadata = {
    videoId: record.videoId,
    chunkIndex: record.chunkIndex ?? chunkIndexFromId(record.id),
    text: record.text,
    startSec: record.startSec,
  };
  return { id: record.id, vector: record.embedding, metadata };
}

function hitFromQuery(hit: KbVectorQueryHit): KbVectorHit {
  return {
    id: hit.id,
    score: hit.score,
    videoId: hit.metadata?.videoId,
    chunkIndex: hit.metadata?.chunkIndex,
    text: hit.metadata?.text,
    startSec: hit.metadata?.startSec,
  };
}

export async function upsertKbVectors(kbId: string, records: KbVectorRecord[]): Promise<void> {
  if (records.length === 0) return;

  await getKbVectorIndex().upsert(kbId, records.map(toStoredVector));

  if (redisVectorIndexWritesEnabled()) {
    await addToKbVectorIndex(
      kbId,
      records.map((record) => ({ id: record.id, embedding: record.embedding }))
    );
  }
}

export async function upsertKbChunkVectors(
  kbId: string,
  chunks: TranscriptChunk[]
): Promise<void> {
  const records = chunks
    .map(kbVectorRecordFromChunk)
    .filter((record): record is KbVectorRecord => record !== null);
  await upsertKbVectors(kbId, records);
}

export async function searchKbVectors(
  kbId: string,
  queryEmbedding: number[],
  topK: number
): Promise<KbVectorHit[]> {
  if (resolveChatVectorBackend() === "redis") {
    return searchKbVectorIndex(kbId, queryEmbedding, topK);
  }

  const hits = await getKbVectorIndex().query(kbId, queryEmbedding, topK);
  return hits.map(hitFromQuery);
}

export async function deleteKbVectors(kbId: string): Promise<void> {
  await Promise.all([getKbVectorIndex().reset(kbId), deleteKbVectorIndex(kbId)]);
}
