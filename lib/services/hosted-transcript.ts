import { youtubeHttpFetch } from "./youtube-http";
import type { RawCaptionSegment } from "./youtube-caption-fetch";

const HOSTED_TIMEOUT_MS = 12_000;

function configuredUrl(): string | undefined {
  return process.env.TRANSCRIPT_API_URL?.trim() || undefined;
}

export function hostedTranscriptConfigured(): boolean {
  return Boolean(configuredUrl());
}

function headerName(): string {
  return process.env.TRANSCRIPT_API_HEADER?.trim() || "x-api-key";
}

function expandUrl(template: string, videoId: string): string {
  const encoded = encodeURIComponent(videoId);
  const watch = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
  return template
    .replaceAll("{videoId}", encoded)
    .replaceAll("{url}", watch);
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

  const lang = typeof record.lang === "string" ? record.lang : fallbackLang;
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

export async function fetchHostedTranscript(videoId: string): Promise<RawCaptionSegment[] | null> {
  const template = configuredUrl();
  if (!template) return null;

  const url = expandUrl(template, videoId);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const apiKey = process.env.TRANSCRIPT_API_KEY?.trim();
  if (apiKey) {
    headers[headerName()] = apiKey;
  }

  const resp = await youtubeHttpFetch(url, {
    headers,
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
    const xmlish = body.trim().startsWith("<");
    if (xmlish) return null;
  }

  const segments = parseHostedTranscriptPayload(parsed);
  return segments.length > 0 ? segments : null;
}
