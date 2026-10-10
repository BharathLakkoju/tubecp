import { assertOpenRouterKey, config } from "../config";
import { recordOpenRouterSttUsage } from "../usage/api-cost";
import type { TranscriptSegment } from "../types";

type VerboseSegment = {
  start?: number;
  end?: number;
  text?: string;
};

type SttVerboseResponse = {
  text?: string;
  segments?: VerboseSegment[];
  duration?: number;
  usage?: { seconds?: number; total_tokens?: number };
};

function openRouterHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${assertOpenRouterKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://tubecp.com",
    "X-Title": "tubecp",
  };
}

export async function transcribeAudioBuffer(
  audio: Buffer,
  format: string,
  options?: { language?: string; usageUserId?: string }
): Promise<{ segments: TranscriptSegment[]; language: string }> {
  const url = `${config.openrouterBaseUrl.replace(/\/$/, "")}/audio/transcriptions`;
  const response = await fetch(url, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: config.sttModel,
      input_audio: {
        data: audio.toString("base64"),
        format,
      },
      language: options?.language ?? "en",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter STT ${response.status}: ${detail.slice(0, 500)}`);
  }

  const data = (await response.json()) as SttVerboseResponse;
  const segments: TranscriptSegment[] = [];

  for (const seg of data.segments ?? []) {
    const text = seg.text?.trim();
    if (!text) continue;
    const start = seg.start ?? 0;
    const end = seg.end ?? start;
    segments.push({
      start,
      duration: Math.max(0, end - start),
      text,
    });
  }

  if (segments.length === 0 && data.text?.trim()) {
    segments.push({
      start: 0,
      duration: data.duration ?? 0,
      text: data.text.trim(),
    });
  }

  const seconds =
    data.usage?.seconds ??
    (segments.length > 0
      ? segments[segments.length - 1].start + segments[segments.length - 1].duration
      : 0);
  await recordOpenRouterSttUsage(options?.usageUserId, seconds);

  return { segments, language: options?.language ?? "en" };
}
