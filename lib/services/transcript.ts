import type { KbTranscriptMode, Transcript, TranscriptSegment } from "../types";
import { getCachedTranscript, cacheTranscript } from "../store";
import {
  fetchYoutubeCaptionSegments,
  type RawCaptionSegment,
} from "./youtube-caption-fetch";
import { fetchHostedTranscript, hostedTranscriptConfigured } from "./hosted-transcript";
import { youtubeCaptionTrackPresence } from "./youtube-captions-api";
import { fetchYoutubeAudioBuffer, YoutubeAudioUnavailableError } from "./youtube-audio";
import { transcribeAudioBuffer } from "./openrouter-stt";
import { pipelineLoadStubEnabled } from "../pipeline/config";

export type TranscriptFailureKind = "permanent" | "transient";

function transcriptFailureKind(detail: string): TranscriptFailureKind {
  if (
    /too many requests|captcha|429|rate.?limit|sign in to confirm|not a bot|blocked|timeout|timed out|aborted|ECONNRESET|ETIMEDOUT|503|502|playability.*LOGIN_REQUIRED|caption scrape returned no segments/i.test(
      detail
    )
  ) {
    return "transient";
  }
  if (/disabled on this video|transcripts are disabled/i.test(detail)) {
    return "permanent";
  }
  return "transient";
}

export class TranscriptUnavailableError extends Error {
  readonly videoId: string;
  readonly kind: TranscriptFailureKind;
  readonly detail: string;

  constructor(videoId: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause ?? "");
    const kind = transcriptFailureKind(detail);
    const reason = detail.includes("disabled")
      ? "transcripts are disabled on this video"
      : detail.includes("not available")
        ? "no transcript is available for this video"
        : /too many requests|captcha|429/i.test(detail)
          ? "YouTube rate-limited transcript access — try again in a few minutes"
          : /sign in to confirm|not a bot/i.test(detail)
            ? "YouTube blocked automated transcript access — try again later"
            : /speech-to-text|STT/i.test(detail)
              ? detail
              : kind === "transient"
                ? "the transcript could not be fetched right now — retrying"
                : "the transcript could not be fetched";

    super(reason);
    this.name = "TranscriptUnavailableError";
    this.videoId = videoId;
    this.kind = kind;
    this.detail = detail;
  }
}

export interface GetTranscriptOptions {
  mode?: KbTranscriptMode;
  usageUserId?: string;
  /** Cap YouTube scrape time. Research uses a short budget so analysis cannot stall. */
  budgetMs?: number;
  /**
   * When scrape + hosted API miss, call captions.list to distinguish
   * "blocked" from "this video has no captions". Default true for KB builds.
   */
  confirmTracks?: boolean;
}

function normalizeCaptionSegment(seg: RawCaptionSegment): TranscriptSegment {
  const usesMilliseconds = seg.offset > 100 || seg.duration > 100;
  return {
    start: usesMilliseconds ? seg.offset / 1000 : seg.offset,
    duration: usesMilliseconds ? seg.duration / 1000 : seg.duration,
    text: seg.text,
  };
}

async function getTranscriptViaCaptions(
  videoId: string,
  options?: GetTranscriptOptions
): Promise<Transcript> {
  let raw: RawCaptionSegment[] = [];
  let scrapeError: unknown;

  if (hostedTranscriptConfigured()) {
    try {
      raw = (await fetchHostedTranscript(videoId)) ?? [];
    } catch (err) {
      scrapeError = err;
    }
  }

  if (raw.length === 0) {
    try {
      raw = await fetchYoutubeCaptionSegments(videoId, { budgetMs: options?.budgetMs });
    } catch (err) {
      scrapeError = scrapeError ?? err;
    }
  }

  if (raw.length > 0) {
    const segments = raw.map(normalizeCaptionSegment);
    const language = raw.find((seg) => seg.lang)?.lang ?? "en";
    const transcript: Transcript = { videoId, language, segments };
    await cacheTranscript(transcript, "captions");
    return transcript;
  }

  const confirmTracks = options?.confirmTracks !== false;
  if (confirmTracks) {
    const presence = await youtubeCaptionTrackPresence(videoId, options?.usageUserId);
    if (presence === "absent") {
      throw new TranscriptUnavailableError(
        videoId,
        new Error("Transcripts are disabled on this video")
      );
    }
    if (presence === "present") {
      throw new TranscriptUnavailableError(
        videoId,
        new Error("Caption tracks exist but YouTube blocked automated access — retrying")
      );
    }
  }

  throw new TranscriptUnavailableError(
    videoId,
    scrapeError ?? new Error("caption scrape returned no segments")
  );
}

async function getTranscriptViaStt(
  videoId: string,
  usageUserId?: string
): Promise<Transcript> {
  try {
    const { buffer, format } = await fetchYoutubeAudioBuffer(videoId);
    const { segments, language } = await transcribeAudioBuffer(buffer, format, {
      usageUserId,
      language: "en",
    });

    if (segments.length === 0) {
      throw new TranscriptUnavailableError(
        videoId,
        new Error("Speech-to-text returned no transcript text")
      );
    }

    const transcript: Transcript = { videoId, language, segments };
    await cacheTranscript(transcript, "stt");
    return transcript;
  } catch (err) {
    if (err instanceof YoutubeAudioUnavailableError) {
      throw new TranscriptUnavailableError(videoId, err);
    }
    if (err instanceof TranscriptUnavailableError) throw err;
    throw new TranscriptUnavailableError(
      videoId,
      err instanceof Error ? err : new Error(String(err))
    );
  }
}

export async function getTranscript(
  videoId: string,
  options?: GetTranscriptOptions
): Promise<Transcript> {
  const mode = options?.mode ?? "captions";
  const cacheVariant = mode === "stt" ? "stt" : "captions";

  const cached = await getCachedTranscript(videoId, cacheVariant);
  if (cached && cached.segments.length > 0) return cached;

  if (pipelineLoadStubEnabled()) {
    const transcript: Transcript = {
      videoId,
      language: "en",
      segments: [{ start: 0, duration: 2, text: "load test transcript ".repeat(40) }],
    };
    await cacheTranscript(transcript, cacheVariant);
    return transcript;
  }

  if (mode === "stt") {
    return getTranscriptViaStt(videoId, options?.usageUserId);
  }

  return getTranscriptViaCaptions(videoId, options);
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
