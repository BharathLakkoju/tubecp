import { generateText, generateEmbedding, cosineSimilarity } from "./llm";
import { getKnowledgeBase, getChunksByIds } from "../store";
import { formatTimestamp, timestampUrl } from "./transcript";
import type { ChatResponse, ChatSource } from "../types";

const CHAT_SYSTEM = `You are a research assistant with access to transcripts from multiple YouTube videos on a specific topic. Answer questions based ONLY on the provided transcript excerpts.

Rules:
1. Ground every claim in the provided excerpts — cite video titles and timestamps.
2. Synthesize across multiple videos when relevant.
3. If the excerpts don't contain enough information to answer, say so explicitly in a "Gaps" section rather than using general knowledge.
4. Be concise but thorough.
5. Format sources at the end as a list.`;

export async function chatWithKnowledgeBase(
  kbId: string,
  message: string
): Promise<ChatResponse> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) {
    throw new Error(`Knowledge base not found: ${kbId}`);
  }
  if (kb.status !== "ready") {
    throw new Error(`Knowledge base is not ready (status: ${kb.status})`);
  }

  const chunks = await getChunksByIds(kb.chunkIds);
  if (chunks.length === 0) {
    return {
      answer: "This knowledge base has no indexed content yet.",
      sources: [],
      gaps: "No transcript data available.",
    };
  }

  const queryEmbedding = await generateEmbedding(message);
  const scored = chunks
    .filter((c) => c.embedding)
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding!),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const topScore = scored[0]?.score ?? 0;
  const context = scored
    .map(
      ({ chunk }) =>
        `[${chunk.title} @ ${formatTimestamp(chunk.timestamp)}]\n${chunk.text}`
    )
    .join("\n\n---\n\n");

  const userPrompt = `Topic: ${kb.topic}

Question: ${message}

Relevant transcript excerpts:
${context}`;

  const answer = await generateText(CHAT_SYSTEM, userPrompt, { maxTokens: 2000 });

  const sources: ChatSource[] = scored.slice(0, 5).map(({ chunk }) => ({
    videoId: chunk.videoId,
    title: chunk.title,
    timestamp: chunk.timestamp,
    url: timestampUrl(chunk.videoId, chunk.timestamp),
    excerpt: chunk.text.slice(0, 200) + (chunk.text.length > 200 ? "..." : ""),
  }));

  let gaps: string | undefined;
  if (topScore < 0.3) {
    gaps =
      "Low confidence — the indexed videos may not contain sufficient information to answer this question well. Consider rephrasing or building a knowledge base with more videos.";
  }

  return { answer, sources, gaps };
}
