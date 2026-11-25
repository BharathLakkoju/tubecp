import { isE2eStubMode, streamStubKnowledgeBaseChat } from "@/lib/e2e-stub";
import { generateText, generateTextStream } from "./llm";
import { retrieveKbChunks } from "./kb-retrieval";
import { getKnowledgeBase } from "../store";
import { formatTimestamp, timestampUrl } from "./transcript";
import type { ChatVectorBackend } from "@/lib/store/vector-backend";
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

export type ChatTimingLog = {
  event: "chat_timings";
  kbId: string;
  backend: ChatVectorBackend;
  embeddingMs: number;
  searchMs: number;
  timeToFirstTokenMs: number | null;
  embeddingCacheHit: boolean;
  hitCount: number;
};

export function logChatTimings(log: ChatTimingLog): void {
  console.info(JSON.stringify(log));
}

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

  const startedAt = Date.now();
  let firstTokenAt: number | null = null;
  let embeddingMs = 0;
  let searchMs = 0;
  let backend: ChatVectorBackend = "upstash";
  let embeddingCacheHit = false;
  let hitCount = 0;

  const markFirstToken = () => {
    if (firstTokenAt === null) firstTokenAt = Date.now();
  };

  const flushTimings = () => {
    logChatTimings({
      event: "chat_timings",
      kbId,
      backend,
      embeddingMs,
      searchMs,
      timeToFirstTokenMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
      embeddingCacheHit,
      hitCount,
    });
  };

  yield { type: "status", message: "Exploring your question..." };

  const kb = await getKnowledgeBase(kbId);
  if (!kb) {
    yield { type: "error", message: `Knowledge base not found: ${kbId}` };
    flushTimings();
    return;
  }
  if (kb.status === "failed") {
    yield { type: "error", message: `Knowledge base is not ready (status: ${kb.status})` };
    flushTimings();
    return;
  }

  if (kb.chunkIds.length === 0 && kb.status !== "building") {
    markFirstToken();
    yield { type: "token", text: "This knowledge base has no indexed content yet." };
    yield {
      type: "done",
      sources: [],
      gaps: "No transcript data available.",
    };
    flushTimings();
    return;
  }

  yield { type: "status", message: "Finding relevant resources..." };

  const retrieval = await retrieveKbChunks(kb, message);
  embeddingMs = retrieval.embeddingMs;
  searchMs = retrieval.searchMs;
  backend = retrieval.backend;
  embeddingCacheHit = retrieval.embeddingCacheHit;
  const scored = retrieval.hits;
  hitCount = scored.length;

  if (kb.status === "building" && scored.length === 0 && kb.chunkIds.length === 0) {
    markFirstToken();
    yield {
      type: "token",
      text: "Indexing is still in progress. Try again in a few seconds — chat is available as soon as the first video is indexed.",
    };
    yield { type: "done", sources: [], gaps: "No chunks indexed yet." };
    flushTimings();
    return;
  }

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

  try {
    for await (const token of generateTextStream(CHAT_SYSTEM, userPrompt, { maxTokens: 2000 })) {
      markFirstToken();
      yield { type: "token", text: token };
    }
  } catch {
    const fallback = await generateText(CHAT_SYSTEM, userPrompt, { maxTokens: 2000 });
    markFirstToken();
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

  flushTimings();
  yield { type: "done", sources, gaps };
}
