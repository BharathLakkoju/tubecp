import { v4 as uuidv4 } from "uuid";
import { getTranscript, getTranscriptDurationMinutes } from "./transcript";
import { generateEmbeddings } from "./llm";
import {
  saveChunk,
  saveKnowledgeBase,
  getChunksForVideos,
  registerVideoChunks,
  getKnowledgeBase,
  updateKnowledgeBase,
} from "../store";
import type { TranscriptChunk, KnowledgeBaseRecord, RankedVideo } from "../types";

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

export async function createKnowledgeBase(
  topic: string,
  rankedVideos: RankedVideo[],
  userId: string,
  persistent = false
): Promise<KnowledgeBaseRecord> {
  const kb: KnowledgeBaseRecord = {
    kbId: uuidv4(),
    topic,
    userId,
    videoIds: rankedVideos.map((v) => v.videoId),
    chunkIds: [],
    chunksIndexed: 0,
    videosIndexed: 0,
    totalMinutes: 0,
    status: "building",
    createdAt: new Date().toISOString(),
  };

  await saveKnowledgeBase(kb, persistent);
  return kb;
}

export async function indexVideoInKnowledgeBase(
  kbId: string,
  video: RankedVideo,
  persistent = false
): Promise<KnowledgeBaseRecord> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) throw new Error(`Knowledge base not found: ${kbId}`);

  const existingChunks = await getChunksForVideos([video.videoId]);
  if (existingChunks.length > 0 && existingChunks.every((c) => c.embedding)) {
    const chunkIds = existingChunks.map((c) => c.id);
    await registerVideoChunks(video.videoId, chunkIds);

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
    return updated;
  }

  const transcript = await getTranscript(video.videoId);
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
        videosIndexed: current.videosIndexed + 1,
      }),
      persistent
    );
    if (!updated) throw new Error("Failed to update knowledge base");
    return updated;
  }

  const embeddings = await generateEmbeddings(chunks.map((c) => c.text));
  const chunkIds: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    chunks[i].embedding = embeddings[i];
    await saveChunk(chunks[i]);
    chunkIds.push(chunks[i].id);
  }

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
  return updated;
}

export async function finalizeKnowledgeBase(
  kbId: string,
  persistent = false
): Promise<KnowledgeBaseRecord> {
  const kb = await getKnowledgeBase(kbId);
  if (!kb) throw new Error(`Knowledge base not found: ${kbId}`);

  const updated: KnowledgeBaseRecord = {
    ...kb,
    status: kb.chunkIds.length > 0 ? "ready" : "failed",
  };

  await saveKnowledgeBase(updated, persistent);
  return updated;
}
