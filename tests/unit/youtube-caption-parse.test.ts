import { describe, expect, it } from "vitest";
import { parseCaptionBody, parseYtInitialPlayerResponse } from "@/lib/services/youtube-caption-fetch";

describe("parseCaptionBody", () => {
  it("parses srv3-style timedtext XML", () => {
    const xml = `<?xml version="1.0"?><timedtext><body><p t="1000" d="2000"><s>Hello</s><s> world</s></p></body></timedtext>`;
    const segments = parseCaptionBody(xml, "en");
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("Hello world");
    expect(segments[0].offset).toBe(1000);
  });

  it("parses json3 caption payloads", () => {
    const json = JSON.stringify({
      events: [
        { tStartMs: 500, dDurationMs: 1500, segs: [{ utf8: "AWS " }, { utf8: "overview" }] },
      ],
    });
    const segments = parseCaptionBody(json, "en");
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("AWS overview");
    expect(segments[0].offset).toBe(500);
  });
});

describe("parseYtInitialPlayerResponse", () => {
  it("reads caption tracks from inline player response JSON", () => {
    const player = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{ baseUrl: "https://www.youtube.com/api/timedtext?v=abc", languageCode: "en" }],
        },
      },
    };
    const html = `<script>var ytInitialPlayerResponse = ${JSON.stringify(player)};</script>`;
    const parsed = parseYtInitialPlayerResponse(html);
    expect(parsed?.captions?.playerCaptionsTracklistRenderer?.captionTracks).toHaveLength(1);
  });

  it("keeps braces that appear inside JSON strings", () => {
    const player = {
      videoDetails: { shortDescription: "see } { this" },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{ baseUrl: "https://www.youtube.com/api/timedtext?v=abc", languageCode: "en" }],
        },
      },
    };
    const html = `<script>var ytInitialPlayerResponse = ${JSON.stringify(player)};</script>`;
    const parsed = parseYtInitialPlayerResponse(html);
    expect(parsed?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.[0]?.languageCode).toBe("en");
  });

  it("skips a non-object assignment and reads the next player response", () => {
    const player = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{ baseUrl: "https://www.youtube.com/api/timedtext?v=abc", languageCode: "en" }],
        },
      },
    };
    const html = `var ytInitialPlayerResponse = null;var ytInitialPlayerResponse = ${JSON.stringify(player)};`;
    const parsed = parseYtInitialPlayerResponse(html);
    expect(parsed?.captions?.playerCaptionsTracklistRenderer?.captionTracks).toHaveLength(1);
  });
});
