import type { ChatMessage, KnowledgeBase } from "../types";
import { getKnowledgeBase, updateKnowledgeBase } from "../store";
import { getRedis } from "../store/redis";

const memory = new Map<string, ChatMessage[]>();

function chatKey(kbId: string): string {
  return `kb-chat:${kbId}`;
}

export function kbWelcomeMessage(kb: Pick<KnowledgeBase, "topic" | "videosIndexed" | "chunksIndexed" | "totalMinutes">): ChatMessage {
  return {
    role: "assistant",
    content: `Knowledge base ready! I've indexed **${kb.videosIndexed}** videos (${kb.chunksIndexed} chunks, ~${kb.totalMinutes} min) on **${kb.topic}**.\n\nAsk me anything — answers are grounded in video transcripts with sources.`,
  };
}

async function readLegacyMessages(kbId: string): Promise<ChatMessage[]> {
  const redis = getRedis();
  if (redis) {
    return (await redis.get<ChatMessage[]>(chatKey(kbId))) ?? [];
  }
  return memory.get(chatKey(kbId)) ?? [];
}

async function writeLegacyMessages(kbId: string, messages: ChatMessage[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(chatKey(kbId), messages);
    return;
  }
  memory.set(chatKey(kbId), messages);
}

export async function getKbChatMessages(kbId: string): Promise<ChatMessage[]> {
  const kb = await getKnowledgeBase(kbId);
  if (kb?.chatMessages?.length) {
    return kb.chatMessages;
  }

  return readLegacyMessages(kbId);
}

export async function saveKbChatMessages(kbId: string, messages: ChatMessage[]): Promise<void> {
  const trimmed = messages.slice(-200);

  const kb = await getKnowledgeBase(kbId);
  if (kb) {
    await updateKnowledgeBase(kbId, (record) => ({ ...record, chatMessages: trimmed }), true);
  }

  await writeLegacyMessages(kbId, trimmed);
}

export async function appendKbChatMessages(
  kbId: string,
  ...entries: ChatMessage[]
): Promise<ChatMessage[]> {
  const existing = await getKbChatMessages(kbId);
  const next = [...existing, ...entries];
  await saveKbChatMessages(kbId, next);
  return next;
}

export async function deleteKbChatData(kbId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(chatKey(kbId));
    return;
  }
  memory.delete(chatKey(kbId));
}

export async function ensureKbWelcomeMessage(kbId: string): Promise<ChatMessage[]> {
  const existing = await getKbChatMessages(kbId);
  if (existing.length > 0) return existing;

  const kb = await getKnowledgeBase(kbId);
  if (!kb || kb.status !== "ready") return existing;

  const welcome = kbWelcomeMessage(kb);
  await saveKbChatMessages(kbId, [welcome]);
  return [welcome];
}
