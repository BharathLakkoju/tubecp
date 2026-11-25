import { describe, expect, it } from "vitest";
import { parseHostedTranscriptPayload } from "@/lib/services/hosted-transcript";

describe("parseHostedTranscriptPayload", () => {
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
