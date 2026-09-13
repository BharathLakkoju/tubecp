import { isE2eStubMode, streamStubKnowledgeBaseChat } from "@/lib/e2e-stub";
import { generateText, generateTextStream, generateEmbedding } from "./llm";
import { searchChunksByEmbedding } from "./chunk-search";
import { getKnowledgeBase, getChunkContentsByIds, type ChunkContent } from "../store";
import { searchKbVectorIndex } from "../store/vector-index";
import { formatTimestamp, timestampUrl } from "./transcript";
import type { ChatResponse, ChatSource } from "../types";

const CHAT_SYSTEM = `You are a research assistant with access to transcripts from multiple YouTube videos on a specific topic. Answer questions based ONLY on the provided transcript excerpts.

Rules:
1. Ground every claim in the provided excerpts — cite video titles and timestamps.
2. Synthesize across multiple videos when relevant.
3. If the excerpts don't contain enough information to answer, say so explicitly in a "Gaps" section rather than using general knowledge.
4. Be concise but thorough.
5. Format sources at the end as a list.`;

export type ChatStreamEvent =
  | { type: "status"; message: string }
  | { type: "token"; text: string }
  | { type: "done"; sources: ChatSource[]; gaps?: string }
  | { type: "error"; message: string };

export async function chatWithKnowledgeBase(
  kbId: string,
  message: string
): Promise<ChatResponse> {
  let answer = "";
  let sources: ChatSource[] = [];
  let gaps: string | undefined;

  for await (const event of streamKnowledgeBaseChat(kbId, message)) {
    if (event.type === "token") {
      answer += event.text;
    } else if (event.type === "done") {
      sources = event.sources;
      gaps = event.gaps;
    } else if (event.type === "error") {
      throw new Error(event.message);
    }
  }

  return { answer, sources, gaps };
}

export async function* streamKnowledgeBaseChat(
  kbId: string,
  message: string
): AsyncGenerator<ChatStreamEvent> {
  if (isE2eStubMode()) {
    yield* streamStubKnowledgeBaseChat(kbId, message);
    return;
  }

  yield { type: "status", message: "Exploring your question..." };

  const kb = await getKnowledgeBase(kbId);
  if (!kb) {
    yield { type: "error", message: `Knowledge base not found: ${kbId}` };
    return;
  }
  if (kb.status !== "ready") {
    yield { type: "error", message: `Knowledge base is not ready (status: ${kb.status})` };
    return;
  }

  if (kb.chunkIds.length === 0) {
    yield { type: "token", text: "This knowledge base has no indexed content yet." };
    yield {
      type: "done",
      sources: [],
      gaps: "No transcript data available.",
    };
    return;
  }

  yield { type: "status", message: "Finding relevant resources..." };

  const queryEmbedding = await generateEmbedding(message);
  let scored: Array<{ chunk: ChunkContent; score: number }>;

  const vectorHits = await searchKbVectorIndex(kbId, queryEmbedding, 12);
  if (vectorHits.length > 0) {
    const chunks = await getChunkContentsByIds(vectorHits.map((hit) => hit.id));
    scored = vectorHits
      .map((hit) => {
        const chunk = chunks.find((candidate) => candidate.id === hit.id);
        return chunk ? { chunk, score: hit.score } : null;
      })
      .filter(
        (entry): entry is { chunk: ChunkContent; score: number } => entry !== null
      );
  } else {
    const fallback = await searchChunksByEmbedding(kb.chunkIds, queryEmbedding, 12);
    scored = fallback.map(({ chunk, score }) => {
      const { embedding: _embedding, ...content } = chunk;
      return { chunk: content, score };
    });
  }

  const topScore = scored[0]?.score ?? 0;

  yield { type: "status", message: "Understanding key points..." };

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

  yield { type: "status", message: "Creating a relevant response..." };

  try {
    for await (const token of generateTextStream(CHAT_SYSTEM, userPrompt, { maxTokens: 2000 })) {
      yield { type: "token", text: token };
    }
  } catch (err) {
    const fallback = await generateText(CHAT_SYSTEM, userPrompt, { maxTokens: 2000 });
    yield { type: "token", text: fallback };
  }

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

  yield { type: "done", sources, gaps };
}
