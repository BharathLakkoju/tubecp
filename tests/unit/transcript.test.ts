import { describe, expect, it } from "vitest";
import { TranscriptUnavailableError } from "@/lib/services/transcript";

describe("TranscriptUnavailableError", () => {
  it("maps rate limit errors to a readable reason", () => {
    const err = new TranscriptUnavailableError(
      "abc",
      new Error("[YoutubeTranscript] YouTube is receiving too many requests")
    );
    expect(err.message).toContain("rate-limited");
  });

  it("marks rate limits as transient", () => {
    const err = new TranscriptUnavailableError(
      "abc",
      new Error("YouTube is receiving too many requests")
    );
    expect(err.kind).toBe("transient");
  });

  it("marks disabled captions as permanent", () => {
    const err = new TranscriptUnavailableError(
      "abc",
      new Error("Transcript is disabled on this video")
    );
    expect(err.kind).toBe("permanent");
  });

  it("maps disabled transcript errors to a readable reason", () => {
    const err = new TranscriptUnavailableError(
      "J90BUTnYd84",
      new Error("[YoutubeTranscript] Transcript is disabled on this video (J90BUTnYd84)")
    );

    expect(err.message).toContain("transcripts are disabled");
    expect(err.videoId).toBe("J90BUTnYd84");
  });
});
