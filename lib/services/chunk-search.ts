import { cosineSimilarity } from "@/lib/services/llm";
import { getChunksByIds } from "@/lib/store";
import type { TranscriptChunk } from "@/lib/types";

const SEARCH_BATCH_SIZE = 24;
const DEFAULT_TOP_K = 12;

function insertTopScored(
  top: Array<{ chunk: TranscriptChunk; score: number }>,
  entry: { chunk: TranscriptChunk; score: number },
  limit: number
): void {
  top.push(entry);
  top.sort((a, b) => b.score - a.score);
  if (top.length > limit) {
    top.length = limit;
  }
}

export async function searchChunksByEmbedding(
  chunkIds: string[],
  queryEmbedding: number[],
  topK = DEFAULT_TOP_K
): Promise<Array<{ chunk: TranscriptChunk; score: number }>> {
  if (chunkIds.length === 0) {
    return [];
  }

  const top: Array<{ chunk: TranscriptChunk; score: number }> = [];

  for (let i = 0; i < chunkIds.length; i += SEARCH_BATCH_SIZE) {
    const batchIds = chunkIds.slice(i, i + SEARCH_BATCH_SIZE);
    const chunks = await getChunksByIds(batchIds);

    for (const chunk of chunks) {
      if (!chunk.embedding) {
        continue;
      }

      insertTopScored(top, {
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }, topK);
    }
  }

  return top.sort((a, b) => b.score - a.score);
}
