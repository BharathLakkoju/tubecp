import { describe, expect, it } from "vitest";
import { TranscriptUnavailableError } from "@/lib/services/transcript";

describe("TranscriptUnavailableError", () => {
  it("maps disabled transcript errors to a readable reason", () => {
    const err = new TranscriptUnavailableError(
      "J90BUTnYd84",
      new Error("[YoutubeTranscript] Transcript is disabled on this video (J90BUTnYd84)")
    );

    expect(err.message).toContain("transcripts are disabled");
    expect(err.videoId).toBe("J90BUTnYd84");
  });
});
