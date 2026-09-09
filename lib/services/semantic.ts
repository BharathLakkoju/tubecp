import { generateEmbedding, generateEmbeddings, cosineSimilarity } from "./llm";
import type { VideoCandidate, TranscriptSegment } from "../types";

const topicEmbeddingCache = new Map<string, number[]>();

export async function getTopicEmbedding(topic: string): Promise<number[]> {
  const key = topic.toLowerCase().trim();
  if (!topicEmbeddingCache.has(key)) {
    topicEmbeddingCache.set(key, await generateEmbedding(topic));
  }
  return topicEmbeddingCache.get(key)!;
}

export function metadataText(video: VideoCandidate): string {
  return `${video.title}. ${video.channel}. ${video.description ?? ""}`.slice(0, 2000);
}

export async function scoreMetadataRelevance(
  topic: string,
  video: VideoCandidate,
  topicEmbedding?: number[]
): Promise<number> {
  const topicEmb = topicEmbedding ?? await getTopicEmbedding(topic);
  const metaEmb = await generateEmbedding(metadataText(video));
  return Math.round(cosineSimilarity(topicEmb, metaEmb) * 100);
}

export async function preRankCandidates(
  topic: string,
  candidates: VideoCandidate[],
  limit = 30
): Promise<VideoCandidate[]> {
  if (candidates.length <= limit) return candidates;

  const topicEmb = await getTopicEmbedding(topic);
  const texts = candidates.map(metadataText);

  const batchSize = 20;
  const scores: number[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await generateEmbeddings(batch);
    for (const emb of embeddings) {
      scores.push(cosineSimilarity(topicEmb, emb));
    }
  }

  return candidates
    .map((video, i) => ({ video, score: scores[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.video);
}

function chunkSegments(
  segments: TranscriptSegment[],
  wordsPerChunk = 120
): Array<{ start: number; text: string }> {
  const chunks: Array<{ start: number; text: string }> = [];
  let words: string[] = [];
  let start = 0;

  for (const seg of segments) {
    const segWords = seg.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) start = seg.start;
    words.push(...segWords);

    if (words.length >= wordsPerChunk) {
      chunks.push({ start, text: words.join(" ") });
      words = words.slice(-30);
      start = seg.start;
    }
  }

  if (words.length >= 30) {
    chunks.push({ start, text: words.join(" ") });
  }

  return chunks;
}

export async function scoreTranscriptRelevance(
  topic: string,
  segments: TranscriptSegment[],
  topicEmbedding?: number[]
): Promise<number> {
  if (segments.length === 0) return 0;

  const topicEmb = topicEmbedding ?? await getTopicEmbedding(topic);
  const chunks = chunkSegments(segments);

  if (chunks.length === 0) return 0;

  const sample = chunks.length <= 8 ? chunks : pickSpreadChunks(chunks, 8);
  const embeddings = await generateEmbeddings(sample.map((c) => c.text));

  let maxSim = 0;
  for (const emb of embeddings) {
    maxSim = Math.max(maxSim, cosineSimilarity(topicEmb, emb));
  }

  return Math.round(maxSim * 100);
}

function pickSpreadChunks<T>(chunks: T[], count: number): T[] {
  if (chunks.length <= count) return chunks;
  const result: T[] = [];
  const step = (chunks.length - 1) / (count - 1);
  for (let i = 0; i < count; i++) {
    result.push(chunks[Math.round(i * step)]);
  }
  return result;
}

export async function selectRelevantTranscriptExcerpts(
  topic: string,
  segments: TranscriptSegment[],
  maxChars = 6500,
  topicEmbedding?: number[]
): Promise<string> {
  if (segments.length === 0) return "";

  const topicEmb = topicEmbedding ?? await getTopicEmbedding(topic);
  const chunks = chunkSegments(segments, 100);

  if (chunks.length === 0) {
    return segments
      .slice(0, 40)
      .map((s) => `[${Math.floor(s.start)}s] ${s.text}`)
      .join("\n")
      .slice(0, maxChars);
  }

  const toScore = chunks.length <= 12 ? chunks : pickSpreadChunks(chunks, 12);
  const embeddings = await generateEmbeddings(toScore.map((c) => c.text));

  const ranked = toScore
    .map((chunk, i) => ({
      chunk,
      score: cosineSimilarity(topicEmb, embeddings[i]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const lines: string[] = [];
  let total = 0;
  for (const { chunk } of ranked) {
    const line = `[${Math.floor(chunk.start)}s] ${chunk.text}`;
    if (total + line.length > maxChars) break;
    lines.push(line);
    total += line.length;
  }

  return lines.join("\n");
}

export function combineScores(
  llmScore: number,
  semanticScore: number,
  metadataScore: number,
  discussionLevel: "mentioned" | "brief" | "substantial"
): number {
  let composite = Math.round(
    llmScore * 0.35 + semanticScore * 0.4 + metadataScore * 0.25
  );

  if (discussionLevel === "substantial") composite = Math.min(100, composite + 5);
  if (discussionLevel === "mentioned" && semanticScore < 40) composite = Math.min(composite, 45);

  return Math.min(100, Math.max(0, composite));
}
