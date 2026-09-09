import { YoutubeTranscript } from "youtube-transcript";
import type { Transcript, TranscriptSegment } from "../types";
import { getCachedTranscript, cacheTranscript } from "../store";

export async function getTranscript(videoId: string): Promise<Transcript> {
  const cached = await getCachedTranscript(videoId);
  if (cached) return cached;

  const raw = await YoutubeTranscript.fetchTranscript(videoId);
  const segments: TranscriptSegment[] = raw.map((seg) => ({
    start: seg.offset / 1000,
    duration: seg.duration / 1000,
    text: seg.text,
  }));

  const transcript: Transcript = {
    videoId,
    language: "en",
    segments,
  };

  await cacheTranscript(transcript);
  return transcript;
}

export function transcriptToText(transcript: Transcript): string {
  return transcript.segments.map((s) => s.text).join(" ");
}

export function getTranscriptDurationMinutes(transcript: Transcript): number {
  if (transcript.segments.length === 0) return 0;
  const last = transcript.segments[transcript.segments.length - 1];
  return (last.start + last.duration) / 60;
}

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function timestampUrl(videoId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}s`;
}
