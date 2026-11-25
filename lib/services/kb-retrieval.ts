import { generateEmbedding } from "@/lib/services/llm";
import { searchChunksByEmbedding } from "@/lib/services/chunk-search";
import {
  getChunkContentsByIds,
  type ChunkContent,
} from "@/lib/store";
import { getOrCreateQuestionEmbedding } from "@/lib/store/question-embedding-cache";
import { searchKbVectors, type KbVectorHit } from "@/lib/store/kb-vectors";
import {
  resolveChatVectorBackend,
  type ChatVectorBackend,
} from "@/lib/store/vector-backend";
import type { KnowledgeBaseRecord } from "@/lib/types";

export const CHAT_RETRIEVAL_TOP_K = 8;

export type RetrievedChunk = {
  chunk: ChunkContent;
  score: number;
};

export type KbRetrievalResult = {
  hits: RetrievedChunk[];
  embeddingMs: number;
  searchMs: number;
  backend: ChatVectorBackend;
  embeddingCacheHit: boolean;
};

function titleForVideo(kb: KnowledgeBaseRecord, videoId: string): string | undefined {
  return kb.rankedVideos?.find((video) => video.videoId === videoId)?.title;
}

function channelForVideo(kb: KnowledgeBaseRecord, videoId: string): string | undefined {
  return kb.rankedVideos?.find((video) => video.videoId === videoId)?.channel;
}

function chunkFromHit(
  hit: KbVectorHit,
  kb: KnowledgeBaseRecord,
  contentsById: Map<string, ChunkContent>
): ChunkContent | null {
  const stored = contentsById.get(hit.id);
  const videoId = hit.videoId ?? stored?.videoId;
  const text = hit.text ?? stored?.text;
  if (!videoId || text === undefined) return null;

  return {
    id: hit.id,
    videoId,
    title: stored?.title ?? titleForVideo(kb, videoId) ?? videoId,
    channel: stored?.channel ?? channelForVideo(kb, videoId) ?? "",
    timestamp: hit.startSec ?? stored?.timestamp ?? 0,
    text,
  };
}

async function hydrateHits(
  kb: KnowledgeBaseRecord,
  hits: KbVectorHit[]
): Promise<RetrievedChunk[]> {
  const missingIds = hits
    .filter((hit) => !hit.text || !hit.videoId || !titleForVideo(kb, hit.videoId))
    .map((hit) => hit.id);
  const contents =
    missingIds.length > 0 ? await getChunkContentsByIds([...new Set(missingIds)]) : [];
  const contentsById = new Map(contents.map((chunk) => [chunk.id, chunk]));

  return hits
    .map((hit) => {
      const chunk = chunkFromHit(hit, kb, contentsById);
      return chunk ? { chunk, score: hit.score } : null;
    })
    .filter((entry): entry is RetrievedChunk => entry !== null);
}

export async function retrieveKbChunks(
  kb: KnowledgeBaseRecord,
  question: string,
  topK = CHAT_RETRIEVAL_TOP_K
): Promise<KbRetrievalResult> {
  const backend = resolveChatVectorBackend();
  const embedStarted = Date.now();
  const { embedding, cacheHit } = await getOrCreateQuestionEmbedding(question, () =>
    generateEmbedding(question)
  );
  const embeddingMs = Date.now() - embedStarted;

  const searchStarted = Date.now();
  let hits = await searchKbVectors(kb.kbId, embedding, topK);

  if (hits.length === 0 && backend === "redis" && kb.chunkIds.length > 0) {
    const fallback = await searchChunksByEmbedding(kb.chunkIds, embedding, topK);
    hits = fallback.map(({ chunk, score }) => ({
      id: chunk.id,
      score,
      videoId: chunk.videoId,
      text: chunk.text,
      startSec: chunk.timestamp,
    }));
  }

  const scored = await hydrateHits(kb, hits);
  const searchMs = Date.now() - searchStarted;

  return {
    hits: scored,
    embeddingMs,
    searchMs,
    backend,
    embeddingCacheHit: cacheHit,
  };
}
