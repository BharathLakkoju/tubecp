import type { Transcript, TranscriptSegment } from "../types";
import { getCachedTranscript, cacheTranscript } from "../store";
import {
  fetchYoutubeCaptionSegments,
  type RawCaptionSegment,
} from "./youtube-caption-fetch";

export class TranscriptUnavailableError extends Error {
  readonly videoId: string;

  constructor(videoId: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause ?? "");
    const reason = detail.includes("disabled")
      ? "transcripts are disabled on this video"
      : detail.includes("not available")
        ? "no transcript is available for this video"
        : /too many requests|captcha|429/i.test(detail)
          ? "YouTube rate-limited transcript access — try again in a few minutes"
          : "the transcript could not be fetched";

    super(reason);
    this.name = "TranscriptUnavailableError";
    this.videoId = videoId;
  }
}

function normalizeCaptionSegment(seg: RawCaptionSegment): TranscriptSegment {
  const usesMilliseconds = seg.offset > 100 || seg.duration > 100;
  return {
    start: usesMilliseconds ? seg.offset / 1000 : seg.offset,
    duration: usesMilliseconds ? seg.duration / 1000 : seg.duration,
    text: seg.text,
  };
}

export async function getTranscript(videoId: string): Promise<Transcript> {
  const cached = await getCachedTranscript(videoId);
  if (cached && cached.segments.length > 0) return cached;

  let raw: RawCaptionSegment[];
  try {
    raw = await fetchYoutubeCaptionSegments(videoId);
  } catch (err) {
    throw new TranscriptUnavailableError(videoId, err);
  }

  if (raw.length === 0) {
    throw new TranscriptUnavailableError(
      videoId,
      new Error("No transcripts are available for this video")
    );
  }

  const segments = raw.map(normalizeCaptionSegment);
  const language = raw.find((seg) => seg.lang)?.lang ?? "en";

  const transcript: Transcript = {
    videoId,
    language,
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
