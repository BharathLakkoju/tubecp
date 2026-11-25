import { youtubeHttpFetch } from "./youtube-http";
import type { RawCaptionSegment } from "./youtube-caption-fetch";

const HOSTED_TIMEOUT_MS = 20_000;

function configuredBase(): string | undefined {
  const base = process.env.TRANSCRIPT_API_BASE?.trim();
  if (!base) return undefined;
  return base.replace(/\/$/, "");
}

function configuredUrl(): string | undefined {
  return process.env.TRANSCRIPT_API_URL?.trim() || undefined;
}

export function hostedTranscriptConfigured(): boolean {
  return Boolean(configuredBase() || configuredUrl());
}

export function videoTranscriptApiUrl(base: string, videoId: string): string {
  const url = new URL("/api/video/transcript", `${base.replace(/\/$/, "")}/`);
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("format", "json");
  url.searchParams.set("includeTimestamps", "true");
  return url.toString();
}

function headerName(): string {
  return process.env.TRANSCRIPT_API_HEADER?.trim() || "x-api-key";
}

function expandUrl(template: string, videoId: string): string {
  const encoded = encodeURIComponent(videoId);
  const watch = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
  return template.replaceAll("{videoId}", encoded).replaceAll("{url}", watch);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function segmentFromUnknown(item: unknown, lang: string): RawCaptionSegment | null {
  const record = asRecord(item);
  if (!record) return null;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  if (!text) return null;
  const offsetRaw = record.offset ?? record.start ?? record.startMs ?? record.tStartMs ?? 0;
  const durationRaw = record.duration ?? record.dur ?? record.durationMs ?? record.dDurationMs ?? 0;
  const offset = Number(offsetRaw);
  const duration = Number(durationRaw);
  return {
    text,
    offset: Number.isFinite(offset) ? offset : 0,
    duration: Number.isFinite(duration) ? duration : 0,
    lang: typeof record.lang === "string" ? record.lang : lang,
  };
}

function segmentsFromList(list: unknown, lang: string): RawCaptionSegment[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => segmentFromUnknown(item, lang))
    .filter((item): item is RawCaptionSegment => item !== null);
}

/** Accept the common hosted-transcript JSON shapes without tying to one vendor. */
export function parseHostedTranscriptPayload(payload: unknown, fallbackLang = "en"): RawCaptionSegment[] {
  if (Array.isArray(payload)) {
    return segmentsFromList(payload, fallbackLang);
  }

  const record = asRecord(payload);
  if (!record) return [];
  if (record.success === false) return [];

  const lang =
    typeof record.lang === "string"
      ? record.lang
      : typeof asRecord(record.metadata)?.default_audio_language === "string"
        ? (asRecord(record.metadata)?.default_audio_language as string)
        : fallbackLang;
  const nested =
    asRecord(record.data) ??
    asRecord(record.result) ??
    asRecord(record.transcript) ??
    record;

  const fromKnownKeys = segmentsFromList(
    record.content ??
      record.segments ??
      record.transcripts ??
      (Array.isArray(record.transcript) ? record.transcript : undefined) ??
      (Array.isArray(nested) ? nested : undefined) ??
      asRecord(nested)?.content ??
      asRecord(nested)?.segments,
    lang
  );
  if (fromKnownKeys.length > 0) return fromKnownKeys;

  const tracks = record.tracks;
  if (Array.isArray(tracks)) {
    for (const track of tracks) {
      const parsed = parseHostedTranscriptPayload(track, lang);
      if (parsed.length > 0) return parsed;
    }
  }

  if (typeof record.transcript === "string" && record.transcript.trim()) {
    return [{ text: record.transcript.trim(), offset: 0, duration: 0, lang }];
  }
  if (typeof record.text === "string" && record.text.trim()) {
    return [{ text: record.text.trim(), offset: 0, duration: 0, lang }];
  }

  return [];
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.TRANSCRIPT_API_KEY?.trim();
  if (apiKey) {
    headers[headerName()] = apiKey;
    if (headerName().toLowerCase() !== "authorization") {
      headers.Authorization = `Bearer ${apiKey}`;
    }
  }
  return headers;
}

async function fetchJsonTranscript(url: string): Promise<RawCaptionSegment[] | null> {
  const resp = await youtubeHttpFetch(url, {
    headers: authHeaders(),
    timeoutMs: HOSTED_TIMEOUT_MS,
  });
  if (resp.status === 429) {
    throw new Error("YouTube is receiving too many requests");
  }
  if (!resp.ok) {
    return null;
  }

  const body = await resp.text();
  let parsed: unknown = body;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return null;
  }

  const segments = parseHostedTranscriptPayload(parsed);
  return segments.length > 0 ? segments : null;
}

export async function fetchHostedTranscript(videoId: string): Promise<RawCaptionSegment[] | null> {
  const base = configuredBase();
  if (base) {
    const fromBase = await fetchJsonTranscript(videoTranscriptApiUrl(base, videoId));
    if (fromBase?.length) return fromBase;
  }

  const template = configuredUrl();
  if (!template) return null;
  return fetchJsonTranscript(expandUrl(template, videoId));
}
