import { YoutubeTranscript } from "youtube-transcript";
import { youtubeHttpFetch } from "./youtube-http";

const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const VIDEO_FETCH_BUDGET_MS = 60_000;

const WATCH_PAGE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

/** Mobile Innertube clients expose caption tracks; WEB/TV often return none on server IPs. */
const INNERTUBE_CLIENTS = [
  {
    clientName: "ANDROID",
    clientVersion: "20.10.38",
    userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
  },
  {
    clientName: "IOS",
    clientVersion: "20.10.4",
    userAgent:
      "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_1 like Mac OS X)",
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

class VideoFetchBudget {
  private readonly deadline: number;

  constructor(ms = VIDEO_FETCH_BUDGET_MS) {
    this.deadline = Date.now() + ms;
  }

  assertTimeRemaining(): void {
    if (Date.now() > this.deadline) {
      throw new Error("YouTube caption fetch timed out for this video");
    }
  }
}

function logCaptionStrategy(
  strategy: string,
  videoId: string,
  detail: { httpStatus?: number; playability?: string }
): void {
  const parts = [
    `YouTube captions [${strategy}] video=${videoId}`,
    detail.httpStatus !== undefined ? `http=${detail.httpStatus}` : null,
    detail.playability ? `playability=${detail.playability}` : null,
  ].filter(Boolean);
  console.warn(parts.join(" "));
}

function playabilityLabel(data: {
  playabilityStatus?: { status?: string; reason?: string };
}): string | undefined {
  const status = data?.playabilityStatus;
  if (!status) return undefined;
  return [status.status, status.reason].filter(Boolean).join(": ");
}

function isBotOrBlockSignal(playability?: string, body?: string): boolean {
  const haystack = `${playability ?? ""} ${body ?? ""}`;
  return /LOGIN_REQUIRED|bot|confirm you.?re not/i.test(haystack);
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

function parseBalancedJsonObject(html: string, startIndex: number): unknown | null {
  if (html[startIndex] !== "{") return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(startIndex, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function jsonStartAfterMarker(html: string, markerAt: number, marker: string): number {
  let index = markerAt + marker.length;
  while (html[index] === " " || html[index] === "\n" || html[index] === "\t") index++;
  return index;
}

export function parseYtInitialPlayerResponse(html: string): {
  captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
} | null {
  const markers = ["var ytInitialPlayerResponse =", "ytInitialPlayerResponse ="];
  for (const marker of markers) {
    let from = 0;
    while (from < html.length) {
      const startIndex = html.indexOf(marker, from);
      if (startIndex === -1) break;
      const parsed = parseBalancedJsonObject(html, jsonStartAfterMarker(html, startIndex, marker));
      if (parsed && typeof parsed === "object") {
        return parsed as {
          captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
        };
      }
      from = startIndex + marker.length;
    }
  }
  return null;
}

function orderedCaptionTracks(tracks: CaptionTrack[], preferredLang?: string): CaptionTrack[] {
  const withUrl = tracks.filter((track) => track.baseUrl);
  const ordered: CaptionTrack[] = [];
  const seen = new Set<string>();

  const push = (track: CaptionTrack | undefined) => {
    if (!track?.baseUrl) return;
    const key = `${track.languageCode ?? ""}:${track.baseUrl}`;
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(track);
  };

  if (preferredLang) {
    push(withUrl.find((track) => track.languageCode === preferredLang));
  }
  for (const code of LANG_PREFERENCE) {
    push(withUrl.find((track) => track.languageCode === code));
  }
  for (const track of withUrl) {
    if (track.languageCode?.startsWith("en")) push(track);
  }
  for (const track of withUrl) {
    push(track);
  }

  return ordered;
}

async function fetchCaptionTracks(
  videoId: string,
  client: (typeof INNERTUBE_CLIENTS)[number],
  budget: VideoFetchBudget
): Promise<CaptionTrack[] | null> {
  try {
    budget.assertTimeRemaining();
    const resp = await youtubeHttpFetch(INNERTUBE_API_URL, {
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
    if (resp.status === 429) {
      throw new Error("YouTube is receiving too many requests");
    }
    const data = (await resp.json()) as {
      captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
      playabilityStatus?: { status?: string; reason?: string };
    };
    const playability = playabilityLabel(data);
    if (!resp.ok) {
      logCaptionStrategy(`innertube:${client.clientName}`, videoId, {
        httpStatus: resp.status,
        playability,
      });
      return null;
    }

    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      logCaptionStrategy(`innertube:${client.clientName}`, videoId, {
        httpStatus: resp.status,
        playability,
      });
      if (isBotOrBlockSignal(playability)) {
        throw new Error("Sign in to confirm you're not a bot");
      }
      return null;
    }
    return tracks;
  } catch (err) {
    if (isRateLimitedError(err)) throw err;
    if (err instanceof Error && /timed out/i.test(err.message)) throw err;
    return null;
  }
}

function isTrustedCaptionHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "youtube.com" || host.endsWith(".youtube.com");
}

async function fetchSegmentsFromTrack(
  track: CaptionTrack,
  videoId: string,
  budget: VideoFetchBudget
): Promise<RawCaptionSegment[]> {
  const baseUrl = track.baseUrl;
  if (!baseUrl) return [];

  const lang = track.languageCode ?? "en";
  try {
    const captionUrl = new URL(baseUrl);
    if (!isTrustedCaptionHost(captionUrl.hostname)) {
      return [];
    }
  } catch {
    return [];
  }

  const watchReferer = `https://www.youtube.com/watch?v=${videoId}`;
  const attempts = [baseUrl, `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}fmt=json3`];

  for (const url of attempts) {
    budget.assertTimeRemaining();
    const resp = await youtubeHttpFetch(url, {
      headers: {
        "User-Agent": WATCH_PAGE_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Referer: watchReferer,
        Origin: "https://www.youtube.com",
      },
    });
    if (resp.status === 429) {
      throw new Error("YouTube is receiving too many requests");
    }
    if (!resp.ok) {
      logCaptionStrategy("caption-track", videoId, { httpStatus: resp.status });
      continue;
    }
    const body = await resp.text();
    const segments = parseCaptionBody(body, lang);
    if (segments.length > 0) return segments;
  }

  return [];
}

async function fetchSegmentsFromTracks(
  tracks: CaptionTrack[],
  videoId: string,
  budget: VideoFetchBudget,
  preferredLang?: string
): Promise<RawCaptionSegment[]> {
  for (const track of orderedCaptionTracks(tracks, preferredLang)) {
    const segments = await fetchSegmentsFromTrack(track, videoId, budget);
    if (segments.length > 0) return segments;
  }
  return [];
}

async function fetchViaInnertube(
  videoId: string,
  budget: VideoFetchBudget
): Promise<RawCaptionSegment[] | null> {
  for (const client of INNERTUBE_CLIENTS) {
    const tracks = await fetchCaptionTracks(videoId, client, budget);
    if (!tracks) continue;

    const segments = await fetchSegmentsFromTracks(tracks, videoId, budget);
    if (segments.length > 0) return segments;
  }
  return null;
}

async function fetchViaWatchPage(
  videoId: string,
  budget: VideoFetchBudget
): Promise<RawCaptionSegment[] | null> {
  try {
    budget.assertTimeRemaining();
    const resp = await youtubeHttpFetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": WATCH_PAGE_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!resp.ok) {
      logCaptionStrategy("watch-page", videoId, { httpStatus: resp.status });
      return null;
    }

    const html = await resp.text();
    if (html.includes('class="g-recaptcha"')) {
      throw new Error("YouTube is receiving too many requests");
    }

    const player = parseYtInitialPlayerResponse(html);
    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      const playability = playabilityLabel(player ?? {});
      logCaptionStrategy("watch-page", videoId, { httpStatus: resp.status, playability });
      if (isBotOrBlockSignal(playability, html)) {
        throw new Error("Sign in to confirm you're not a bot");
      }
      return null;
    }

    const segments = await fetchSegmentsFromTracks(tracks, videoId, budget);
    if (segments.length > 0) return segments;
  } catch (err) {
    if (isRateLimitedError(err)) throw err;
    if (err instanceof Error && /timed out|bot/i.test(err.message)) throw err;
  }
  return null;
}

async function fetchViaYoutubeTranscriptPackage(
  videoId: string,
  budget: VideoFetchBudget
): Promise<RawCaptionSegment[] | null> {
  for (const lang of [...LANG_PREFERENCE, undefined]) {
    try {
      budget.assertTimeRemaining();
      const raw = await YoutubeTranscript.fetchTranscript(videoId, lang ? { lang } : undefined);
      if (raw.length > 0) {
        return raw.map((seg) => ({
          text: seg.text,
          offset: seg.offset,
          duration: seg.duration,
          lang: seg.lang ?? lang ?? "en",
        }));
      }
    } catch (err) {
      if (isRateLimitedError(err)) throw err;
    }
  }

  return null;
}

export async function fetchYoutubeCaptionSegments(videoId: string): Promise<RawCaptionSegment[]> {
  const budget = new VideoFetchBudget();
  const strategies = [
    (id: string) => fetchViaInnertube(id, budget),
    (id: string) => fetchViaWatchPage(id, budget),
    (id: string) => fetchViaYoutubeTranscriptPackage(id, budget),
  ];
  let rateLimit: unknown;
  let answered = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    rateLimit = undefined;
    answered = false;

    for (const strategy of strategies) {
      try {
        const segments = await strategy(videoId);
        answered = true;
        if (segments?.length) return segments;
      } catch (err) {
        if (isRateLimitedError(err)) {
          rateLimit = err;
          continue;
        }
        if (err instanceof Error && /timed out|bot/i.test(err.message)) {
          throw err;
        }
        throw err;
      }
    }

    if (!rateLimit || answered) break;
    if (attempt === 0) await sleep(2000);
  }

  if (rateLimit && !answered) {
    throw rateLimit instanceof Error ? rateLimit : new Error(String(rateLimit));
  }
  throw new Error("No transcripts are available for this video");
}
