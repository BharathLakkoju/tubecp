import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseHostedTranscriptPayload,
  videoTranscriptApiUrl,
  hostedTranscriptConfigured,
  fetchHostedTranscript,
} from "@/lib/services/hosted-transcript";

vi.mock("@/lib/services/youtube-http", () => ({
  youtubeHttpFetch: vi.fn(),
}));

import { youtubeHttpFetch } from "@/lib/services/youtube-http";

describe("parseHostedTranscriptPayload", () => {
  it("reads TRANSCRIPT_API_BASE payloads with transcript[].start", () => {
    const segments = parseHostedTranscriptPayload({
      success: true,
      videoId: "abc",
      transcript: [
        { text: "Never gonna give you up", start: 43.0, duration: 2.12 },
      ],
      metadata: { default_audio_language: "en" },
    });
    expect(segments).toEqual([
      { text: "Never gonna give you up", offset: 43, duration: 2.12, lang: "en" },
    ]);
  });

  it("reads Supadata-style content arrays", () => {
    const segments = parseHostedTranscriptPayload({
      lang: "en",
      content: [{ text: "Hello", offset: 0, duration: 1200 }],
    });
    expect(segments).toEqual([{ text: "Hello", offset: 0, duration: 1200, lang: "en" }]);
  });

  it("reads nested tracks and transcript strings", () => {
    expect(
      parseHostedTranscriptPayload({
        tracks: [{ transcript: [{ text: "Hi", start: 1.5, duration: 2 }] }],
      })[0]
    ).toMatchObject({ text: "Hi", offset: 1.5, duration: 2 });

    expect(parseHostedTranscriptPayload({ transcript: "Full talk" })).toEqual([
      { text: "Full talk", offset: 0, duration: 0, lang: "en" },
    ]);
  });
});

describe("TRANSCRIPT_API_BASE", () => {
  afterEach(() => {
    delete process.env.TRANSCRIPT_API_BASE;
    delete process.env.TRANSCRIPT_API_URL;
    vi.clearAllMocks();
  });

  it("builds GET /api/video/transcript?videoId=", () => {
    expect(
      videoTranscriptApiUrl(
        "https://get-transcript-back-pymasters-production.up.railway.app",
        "dQw4w9WgXcQ"
      )
    ).toBe(
      "https://get-transcript-back-pymasters-production.up.railway.app/api/video/transcript?videoId=dQw4w9WgXcQ&format=json&includeTimestamps=true"
    );
  });

  it("is configured from TRANSCRIPT_API_BASE", () => {
    expect(hostedTranscriptConfigured()).toBe(false);
    process.env.TRANSCRIPT_API_BASE =
      "https://get-transcript-back-pymasters-production.up.railway.app";
    expect(hostedTranscriptConfigured()).toBe(true);
  });

  it("fetches from TRANSCRIPT_API_BASE before any URL template", async () => {
    process.env.TRANSCRIPT_API_BASE =
      "https://get-transcript-back-pymasters-production.up.railway.app";
    vi.mocked(youtubeHttpFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          transcript: [{ text: "From Railway", start: 1, duration: 2 }],
        }),
        { status: 200 }
      )
    );

    const segments = await fetchHostedTranscript("abc123");
    expect(segments?.[0]?.text).toBe("From Railway");
    expect(vi.mocked(youtubeHttpFetch).mock.calls[0]?.[0]).toContain(
      "/api/video/transcript?videoId=abc123"
    );
  });
});
