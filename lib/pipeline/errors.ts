import { isRetryableLlmError } from "@/lib/services/llm";
import { TranscriptUnavailableError } from "@/lib/services/transcript";

export type PipelineErrorClass =
  | "no_captions"
  | "invalid_video"
  | "blocked"
  | "rate_limited"
  | "provider_429"
  | "provider_5xx"
  | "unknown";

const TERMINAL: ReadonlySet<PipelineErrorClass> = new Set(["no_captions", "invalid_video"]);

const INVALID_VIDEO_RE =
  /video(?: is)? unavailable|private video|has been removed|does not exist|invalid video id/i;
const BLOCKED_RE = /sign in to confirm|not a bot|captcha|blocked/i;
const RATE_LIMITED_RE = /too many requests|\b429\b|rate.?limit/i;

function errorText(err: unknown): string {
  if (err instanceof TranscriptUnavailableError) {
    return `${err.message} ${err.detail}`;
  }
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    return cause instanceof Error ? `${err.message} ${cause.message}` : err.message;
  }
  return String(err ?? "");
}

export function classifyPipelineError(err: unknown): PipelineErrorClass {
  const text = errorText(err);

  if (err instanceof TranscriptUnavailableError) {
    if (INVALID_VIDEO_RE.test(text)) return "invalid_video";
    if (err.kind === "permanent") return "no_captions";
    if (BLOCKED_RE.test(text)) return "blocked";
    if (RATE_LIMITED_RE.test(text)) return "rate_limited";
    return "unknown";
  }

  if (isRetryableLlmError(err)) {
    const status = (err as { status?: number }).status;
    return status === 429 || RATE_LIMITED_RE.test(text) ? "provider_429" : "provider_5xx";
  }

  return "unknown";
}

export function isTerminalErrorClass(errorClass: PipelineErrorClass): boolean {
  return TERMINAL.has(errorClass);
}

const BACKOFF_BASE_SECONDS = 5;
const BACKOFF_FACTOR = 4;
export const MAX_BACKOFF_SECONDS = 300;

/** 5s, 20s, 80s, 300s... with up to 20% jitter, for the Nth receive of a message (1-based). */
export function retryBackoffSeconds(receiveCount: number, random: () => number = Math.random): number {
  const attempt = Math.max(0, receiveCount - 1);
  const base = Math.min(MAX_BACKOFF_SECONDS, BACKOFF_BASE_SECONDS * BACKOFF_FACTOR ** attempt);
  const jitter = 1 + (random() * 0.4 - 0.2);
  return Math.min(MAX_BACKOFF_SECONDS, Math.max(1, Math.round(base * jitter)));
}

export function describePipelineError(err: unknown): string {
  return errorText(err).slice(0, 500) || "Indexing failed";
}
