import { getKbChatMessages } from "@/lib/services/kb-chat";
import { getChunksByIds, getKnowledgeBase } from "@/lib/store";
import type { KnowledgeBaseRecord } from "@/lib/types";

export async function exportKnowledgeBase(kbId: string, userId: string) {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) {
    throw new Error(`Knowledge base not found: ${kbId}`);
  }
  if (kb.userId !== userId) {
    throw new Error("You do not have access to this knowledge base");
  }

  const [chunks, messages] = await Promise.all([
    getChunksByIds(kb.chunkIds),
    getKbChatMessages(kbId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    knowledgeBase: {
      kbId: kb.kbId,
      topic: kb.topic,
      status: kb.status,
      videoIds: kb.videoIds,
      videosIndexed: kb.videosIndexed,
      chunksIndexed: kb.chunksIndexed,
      totalMinutes: kb.totalMinutes,
      createdAt: kb.createdAt,
      rankedVideos: kb.rankedVideos ?? [],
    },
    chunks: chunks.map((chunk) => ({
      id: chunk.id,
      videoId: chunk.videoId,
      title: chunk.title,
      channel: chunk.channel,
      timestamp: chunk.timestamp,
      text: chunk.text,
    })),
    chatMessages: messages,
  };
}

export async function exportKnowledgeBaseSummary(kb: KnowledgeBaseRecord) {
  const messages = await getKbChatMessages(kb.kbId);
  const chunks = await getChunksByIds(kb.chunkIds);

  return {
    kbId: kb.kbId,
    topic: kb.topic,
    status: kb.status,
    videosIndexed: kb.videosIndexed,
    chunksIndexed: kb.chunksIndexed,
    createdAt: kb.createdAt,
    rankedVideos: kb.rankedVideos ?? [],
    chunkCount: chunks.length,
    chatMessageCount: messages.length,
    chunks: chunks.map((chunk) => ({
      id: chunk.id,
      videoId: chunk.videoId,
      title: chunk.title,
      channel: chunk.channel,
      timestamp: chunk.timestamp,
      text: chunk.text,
    })),
    chatMessages: messages,
  };
}
