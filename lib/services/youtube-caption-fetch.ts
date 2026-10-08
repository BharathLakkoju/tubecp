import { YoutubeTranscript } from "youtube-transcript";

const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

const INNERTUBE_CLIENTS = [
  {
    clientName: "ANDROID",
    clientVersion: "20.10.38",
    userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
  },
  {
    clientName: "WEB",
    clientVersion: "2.20250326.01.00",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  },
  {
    clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    clientVersion: "2.0",
    userAgent:
      "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version/gles Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
] as const;

const LANG_PREFERENCE = ["en", "en-US", "en-GB", "a.en"] as const;

export interface RawCaptionSegment {
  offset: number;
  duration: number;
  text: string;
  lang: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitedError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /too many requests|captcha|429/i.test(message);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function parseCaptionXml(xml: string, lang: string): RawCaptionSegment[] {
  const results: RawCaptionSegment[] = [];

  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match: RegExpExecArray | null;
  while ((match = pRegex.exec(xml)) !== null) {
    const offset = parseInt(match[1], 10);
    const duration = parseInt(match[2], 10);
    const inner = match[3];
    let text = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = sRegex.exec(inner)) !== null) {
      text += sMatch[1];
    }
    if (!text) {
      text = inner.replace(/<[^>]+>/g, "");
    }
    text = decodeEntities(text).trim();
    if (text) {
      results.push({ text, duration, offset, lang });
    }
  }

  if (results.length > 0) return results;

  const classicRegex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
  while ((match = classicRegex.exec(xml)) !== null) {
    const text = decodeEntities(match[3]).trim();
    if (!text) continue;
    results.push({
      text,
      duration: parseFloat(match[2]) * 1000,
      offset: parseFloat(match[1]) * 1000,
      lang,
    });
  }

  return results;
}

function parseCaptionJson3(body: string, lang: string): RawCaptionSegment[] {
  let data: { events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> };
  try {
    data = JSON.parse(body) as typeof data;
  } catch {
    return [];
  }

  const results: RawCaptionSegment[] = [];
  for (const event of data.events ?? []) {
    const text = (event.segs ?? [])
      .map((seg) => seg.utf8 ?? "")
      .join("")
      .replace(/\n/g, " ")
      .trim();
    if (!text) continue;
    results.push({
      text,
      offset: event.tStartMs ?? 0,
      duration: event.dDurationMs ?? 0,
      lang,
    });
  }
  return results;
}

export function parseCaptionBody(body: string, lang: string): RawCaptionSegment[] {
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) {
    const json3 = parseCaptionJson3(trimmed, lang);
    if (json3.length > 0) return json3;
  }
  return parseCaptionXml(body, lang);
}

type CaptionTrack = { baseUrl?: string; languageCode?: string };

async function fetchCaptionTracks(
  videoId: string,
  client: (typeof INNERTUBE_CLIENTS)[number]
): Promise<CaptionTrack[] | null> {
  try {
    const resp = await fetch(INNERTUBE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: client.clientName,
            clientVersion: client.clientVersion,
            hl: "en",
            gl: "US",
          },
        },
        videoId,
      }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
    };
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    return Array.isArray(tracks) && tracks.length > 0 ? tracks : null;
  } catch {
    return null;
  }
}

function pickCaptionTrack(tracks: CaptionTrack[], preferredLang?: string): CaptionTrack | null {
  if (preferredLang) {
    const exact = tracks.find((track) => track.languageCode === preferredLang);
    if (exact?.baseUrl) return exact;
  }

  for (const code of LANG_PREFERENCE) {
    const track = tracks.find((t) => t.languageCode === code);
    if (track?.baseUrl) return track;
  }

  const english = tracks.find((t) => t.languageCode?.startsWith("en"));
  if (english?.baseUrl) return english;

  return tracks.find((t) => t.baseUrl) ?? null;
}

async function fetchSegmentsFromTrack(track: CaptionTrack): Promise<RawCaptionSegment[]> {
  const baseUrl = track.baseUrl;
  if (!baseUrl) return [];

  const lang = track.languageCode ?? "en";
  const captionUrl = new URL(baseUrl);
  if (!captionUrl.hostname.endsWith(".youtube.com")) {
    return [];
  }

  const attempts = [baseUrl, `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}fmt=json3`];

  for (const url of attempts) {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": INNERTUBE_CLIENTS[1].userAgent,
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!resp.ok) continue;
    const body = await resp.text();
    const segments = parseCaptionBody(body, lang);
    if (segments.length > 0) return segments;
  }

  return [];
}

async function fetchViaInnertube(videoId: string): Promise<RawCaptionSegment[] | null> {
  for (const client of INNERTUBE_CLIENTS) {
    const tracks = await fetchCaptionTracks(videoId, client);
    if (!tracks) continue;

    for (const lang of [...LANG_PREFERENCE, undefined]) {
      const track = pickCaptionTrack(tracks, lang);
      if (!track) continue;
      const segments = await fetchSegmentsFromTrack(track);
      if (segments.length > 0) return segments;
    }
  }
  return null;
}

async function fetchViaYoutubeTranscriptPackage(videoId: string): Promise<RawCaptionSegment[] | null> {
  for (const lang of [...LANG_PREFERENCE, undefined]) {
    try {
      const raw = await YoutubeTranscript.fetchTranscript(
        videoId,
        lang ? { lang } : undefined
      );
      if (raw.length > 0) {
        return raw.map((seg) => ({
          text: seg.text,
          offset: seg.offset,
          duration: seg.duration,
          lang: seg.lang ?? lang ?? "en",
        }));
      }
    } catch {
      // try next language / strategy
    }
  }
  return null;
}

export async function fetchYoutubeCaptionSegments(videoId: string): Promise<RawCaptionSegment[]> {
  const maxAttempts = 4;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const fromPackage = await fetchViaYoutubeTranscriptPackage(videoId);
      if (fromPackage?.length) return fromPackage;

      const fromInnertube = await fetchViaInnertube(videoId);
      if (fromInnertube?.length) return fromInnertube;

      throw new Error("No transcripts are available for this video");
    } catch (err) {
      lastError = err;
      if (isRateLimitedError(err) && attempt < maxAttempts - 1) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
