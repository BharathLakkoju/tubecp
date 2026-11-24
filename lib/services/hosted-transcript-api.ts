import type { Transcript, TranscriptSegment } from "../types";

const HOSTED_TRANSCRIPT_TIMEOUT_MS = 45_000;

type HostedTranscriptSegmentJson = {
  text?: unknown;
  start?: unknown;
  duration?: unknown;
};

type HostedTranscriptSuccessJson = {
  success?: unknown;
  videoId?: unknown;
  transcript?: unknown;
  language?: unknown;
};

function parseSegment(raw: HostedTranscriptSegmentJson): TranscriptSegment | null {
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!text) return null;
  const start = typeof raw.start === "number" && Number.isFinite(raw.start) ? raw.start : 0;
  const duration =
    typeof raw.duration === "number" && Number.isFinite(raw.duration) ? raw.duration : 0;
  return { start, duration, text };
}

function parseSuccessBody(body: HostedTranscriptSuccessJson, videoId: string): Transcript {
  const segments = Array.isArray(body.transcript)
    ? body.transcript
        .map((item) => (item && typeof item === "object" ? parseSegment(item as HostedTranscriptSegmentJson) : null))
        .filter((seg): seg is TranscriptSegment => seg !== null)
    : [];

  const language = typeof body.language === "string" && body.language.trim() ? body.language : "en";
  const resolvedVideoId =
    typeof body.videoId === "string" && body.videoId.trim() ? body.videoId : videoId;

  return { videoId: resolvedVideoId, language, segments };
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown; message?: unknown };
    if (typeof body.detail === "string" && body.detail.trim()) return body.detail.trim();
    if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  } catch {
    /* ignore parse errors */
  }
  return `Hosted transcript API HTTP ${response.status}`;
}

/** Fetches timed transcript segments from a hosted GET /api/video/transcript service. */
export async function fetchHostedTranscript(baseUrl: string, videoId: string): Promise<Transcript> {
  const root = baseUrl.replace(/\/$/, "");
  const url = new URL(`${root}/api/video/transcript`);
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(HOSTED_TRANSCRIPT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }

  const body = (await response.json()) as HostedTranscriptSuccessJson & { success?: boolean };
  if (body.success === false) {
    throw new Error("Hosted transcript API returned success=false");
  }

  return parseSuccessBody(body, videoId);
}