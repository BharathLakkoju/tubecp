import { v4 as uuidv4 } from "uuid";
import { hasMeaningfulEmbeddingContent } from "../embedding-input";
import {
  getTranscript,
  getTranscriptDurationMinutes,
  TranscriptUnavailableError,
} from "./transcript";
import { generateEmbeddings } from "./llm";
import {
  saveChunk,
  saveKnowledgeBase,
  getChunksByIds,
  getChunksForVideos,
  registerVideoChunks,
  getKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBaseRecord,
  deleteChunksForKnowledgeBase,
  removeUserKnowledgeBase,
} from "../store";
import { addToKbVectorIndex, deleteKbVectorIndex } from "../store/vector-index";
import { deleteKbChatData } from "./kb-chat";
import { deleteSavedResearchMirrorForKnowledgeBase } from "./saved-research";
import type {
  KbBuildOptions,
  TranscriptChunk,
  KnowledgeBaseRecord,
  RankedVideo,
} from "../types";

const WORDS_PER_CHUNK = 200;
const OVERLAP_WORDS = 40;

function chunkTranscript(
  segments: { start: number; duration: number; text: string }[],
  videoId: string,
  title: string,
  channel: string
): TranscriptChunk[] {
  const fullText = segments.map((s) => s.text).join(" ");
  const words = fullText.split(/\s+/).filter(Boolean);
  const chunks: TranscriptChunk[] = [];

  if (words.length === 0) return chunks;

  const wordTimestamps: number[] = [];
  for (const seg of segments) {
    const segWords = seg.text.split(/\s+/).filter(Boolean);
    for (let i = 0; i < segWords.length; i++) {
      wordTimestamps.push(seg.start);
    }
  }

  for (let i = 0; i < words.length; i += WORDS_PER_CHUNK - OVERLAP_WORDS) {
    const chunkWords = words.slice(i, i + WORDS_PER_CHUNK);
    if (chunkWords.length < 20) continue;

    const timestamp = wordTimestamps[i] ?? 0;
    chunks.push({
      id: uuidv4(),
      videoId,
      title,
      channel,
      timestamp,
      text: chunkWords.join(" "),
    });
  }

  return chunks;
}

/** True when this KB already has embedded chunks for the video. */
export async function isVideoIndexedInKnowledgeBase(
  kb: KnowledgeBaseRecord,
  videoId: string
): Promise<boolean> {
  if (kb.chunkIds.length === 0) return false;

  const kbChunkSet = new Set(kb.chunkIds);
  const chunks = await getChunksForVideos([videoId]);
  return chunks.some((chunk) => Boolean(chunk.embedding) && kbChunkSet.has(chunk.id));
}

/** Reconcile videosIndexed / chunksIndexed from stored chunk ids (e.g. after resume or recovery). */
export async function syncKnowledgeBaseIndexStats(
  kbId: string,
  persistent = false
): Promise<KnowledgeBaseRecord | null> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) return null;

  const chunks = await getChunksByIds(kb.chunkIds);
  const indexedVideoIds = [...new Set(chunks.map((chunk) => chunk.videoId))];

  return updateKnowledgeBase(
    kbId,
    (current) => ({
      ...current,
      videosIndexed: indexedVideoIds.length,
      chunksIndexed: current.chunkIds.length,
      videoIds: [...new Set([...current.videoIds, ...indexedVideoIds])],
    }),
    persistent
  );
}

export async function getIndexedVideoIdsForKnowledgeBase(kbId: string): Promise<string[]> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb?.chunkIds.length) return [];
  const chunks = await getChunksByIds(kb.chunkIds);
  return [...new Set(chunks.map((chunk) => chunk.videoId))];
}

export async function createKnowledgeBase(
  topic: string,
  rankedVideos: RankedVideo[],
  userId: string,
  persistent = false,
  buildOptions?: KbBuildOptions
): Promise<KnowledgeBaseRecord> {
  const kb: KnowledgeBaseRecord = {
    kbId: uuidv4(),
    topic,
    userId,
    rankedVideos,
    videoIds: rankedVideos.map((v) => v.videoId),
    chunkIds: [],
    chunksIndexed: 0,
    videosIndexed: 0,
    totalMinutes: 0,
    status: "building",
    createdAt: new Date().toISOString(),
    buildOptions: buildOptions ?? { transcriptMode: "captions" },
  };

  await saveKnowledgeBase(kb, persistent);
  return kb;
}

export interface IndexVideoResult {
  kb: KnowledgeBaseRecord;
  skipped: boolean;
  skipReason?: string;
}

export async function indexVideoInKnowledgeBase(
  kbId: string,
  video: RankedVideo,
  persistent = false,
  userId?: string
): Promise<IndexVideoResult> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) throw new Error(`Knowledge base not found: ${kbId}`);

  const existingChunks = await getChunksForVideos([video.videoId]);
  if (existingChunks.length > 0 && existingChunks.every((c) => c.embedding)) {
    const chunkIds = existingChunks.map((c) => c.id);
    await registerVideoChunks(video.videoId, chunkIds);
    await addToKbVectorIndex(
      kbId,
      existingChunks.map((chunk) => ({ id: chunk.id, embedding: chunk.embedding! }))
    );

    const updated = await updateKnowledgeBase(
      kbId,
      (current) => ({
        ...current,
        chunkIds: [...new Set([...current.chunkIds, ...chunkIds])],
        chunksIndexed: [...new Set([...current.chunkIds, ...chunkIds])].length,
        videosIndexed: current.videosIndexed + 1,
        totalMinutes: current.totalMinutes + existingChunks.length * 0.5,
      }),
      persistent
    );

    if (!updated) throw new Error("Failed to update knowledge base");
    return { kb: updated, skipped: false };
  }

  const transcriptMode = kb.buildOptions?.transcriptMode ?? "captions";

  let transcript;
  try {
    transcript = await getTranscript(video.videoId, {
      mode: transcriptMode,
      usageUserId: userId,
    });
  } catch (err) {
    if (err instanceof TranscriptUnavailableError) {
      const updated = await updateKnowledgeBase(
        kbId,
        (current) => ({
          ...current,
          videoIds: current.videoIds.filter((id) => id !== video.videoId),
        }),
        persistent
      );

      if (!updated) throw new Error("Failed to update knowledge base");

      return {
        kb: updated,
        skipped: true,
        skipReason: `"${video.title}" skipped — ${err.message}.`,
      };
    }

    throw err;
  }
  if (transcript.segments.length === 0) {
    const updated = await updateKnowledgeBase(
      kbId,
      (current) => ({
        ...current,
        videoIds: current.videoIds.filter((id) => id !== video.videoId),
      }),
      persistent
    );
    if (!updated) throw new Error("Failed to update knowledge base");
    return {
      kb: updated,
      skipped: true,
      skipReason: `"${video.title}" skipped — transcript was empty after fetch.`,
    };
  }

  const minutes = getTranscriptDurationMinutes(transcript);
  const chunks = chunkTranscript(
    transcript.segments,
    video.videoId,
    video.title,
    video.channel
  );

  if (chunks.length === 0) {
    const updated = await updateKnowledgeBase(
      kbId,
      (current) => ({
        ...current,
        videoIds: current.videoIds.filter((id) => id !== video.videoId),
      }),
      persistent
    );
    if (!updated) throw new Error("Failed to update knowledge base");
    return {
      kb: updated,
      skipped: true,
      skipReason: `"${video.title}" skipped — transcript was too short to index.`,
    };
  }

  const embeddableChunks = chunks.filter((chunk) => hasMeaningfulEmbeddingContent(chunk.text));

  if (embeddableChunks.length === 0) {
    const updated = await updateKnowledgeBase(
      kbId,
      (current) => ({
        ...current,
        videosIndexed: current.videosIndexed + 1,
      }),
      persistent
    );
    if (!updated) throw new Error("Failed to update knowledge base");
    return { kb: updated, skipped: false };
  }

  const embeddings = await generateEmbeddings(embeddableChunks.map((c) => c.text));
  const chunkIds: string[] = [];

  for (let i = 0; i < embeddableChunks.length; i++) {
    embeddableChunks[i].embedding = embeddings[i];
    await saveChunk(embeddableChunks[i]);
    chunkIds.push(embeddableChunks[i].id);
  }

  await addToKbVectorIndex(
    kbId,
    embeddableChunks.map((chunk) => ({ id: chunk.id, embedding: chunk.embedding! }))
  );
  await registerVideoChunks(video.videoId, chunkIds);

  const updated = await updateKnowledgeBase(
    kbId,
    (current) => ({
      ...current,
      chunkIds: [...new Set([...current.chunkIds, ...chunkIds])],
      chunksIndexed: [...new Set([...current.chunkIds, ...chunkIds])].length,
      videosIndexed: current.videosIndexed + 1,
      totalMinutes: Math.round(current.totalMinutes + minutes),
    }),
    persistent
  );

  if (!updated) throw new Error("Failed to update knowledge base");
  return { kb: updated, skipped: false };
}

export async function finalizeKnowledgeBase(
  kbId: string,
  persistent = false
): Promise<KnowledgeBaseRecord> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) throw new Error(`Knowledge base not found: ${kbId}`);

  // Vector index is built incrementally during indexing — avoid reloading all chunks here.
  const updated: KnowledgeBaseRecord = {
    ...kb,
    status: kb.chunkIds.length > 0 ? "ready" : "failed",
  };

  await saveKnowledgeBase(updated, persistent);
  return updated;
}

export async function deleteKnowledgeBase(kbId: string, userId: string): Promise<void> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) {
    throw new Error(`Knowledge base not found: ${kbId}`);
  }
  if (kb.userId !== userId) {
    throw new Error("You do not have access to this knowledge base");
  }

  await deleteChunksForKnowledgeBase(kb.videoIds, kb.chunkIds);
  await deleteKbVectorIndex(kbId);
  await deleteKbChatData(kbId);
  await deleteKnowledgeBaseRecord(kbId);
  await removeUserKnowledgeBase(userId, kbId);
  await deleteSavedResearchMirrorForKnowledgeBase(kbId, userId);
}
