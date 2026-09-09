import { describe, expect, it } from "vitest";
import {
  formatTimestamp,
  getTranscriptDurationMinutes,
  timestampUrl,
  transcriptToText,
} from "@/lib/services/transcript";
import type { Transcript } from "@/lib/types";

const sampleTranscript: Transcript = {
  videoId: "abc",
  language: "en",
  segments: [
    { start: 0, duration: 5, text: "Hello" },
    { start: 5, duration: 10, text: "world" },
    { start: 125, duration: 5, text: "done" },
  ],
};

describe("transcript utilities", () => {
  it("joins segment text", () => {
    expect(transcriptToText(sampleTranscript)).toBe("Hello world done");
  });

  it("computes duration in minutes", () => {
    expect(getTranscriptDurationMinutes(sampleTranscript)).toBeCloseTo(2.167, 2);
  });

  it("formats timestamps under one hour", () => {
    expect(formatTimestamp(125)).toBe("2:05");
  });

  it("formats timestamps over one hour", () => {
    expect(formatTimestamp(3665)).toBe("1:01:05");
  });

  it("builds YouTube timestamp URLs", () => {
    expect(timestampUrl("abc", 125.7)).toBe("https://www.youtube.com/watch?v=abc&t=125s");
  });
});
