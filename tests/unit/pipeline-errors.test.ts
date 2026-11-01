import { describe, expect, it } from "vitest";
import {
  classifyPipelineError,
  isTerminalErrorClass,
  retryBackoffSeconds,
} from "@/lib/pipeline/errors";
import { TranscriptUnavailableError } from "@/lib/services/transcript";

describe("pipeline error classes", () => {
  it("maps permanent transcript errors to no_captions", () => {
    const err = new TranscriptUnavailableError(
      "abc",
      new Error("Transcript is disabled on this video")
    );
    expect(classifyPipelineError(err)).toBe("no_captions");
    expect(isTerminalErrorClass("no_captions")).toBe(true);
  });

  it("maps invalid videos", () => {
    const err = new TranscriptUnavailableError("abc", new Error("This video is unavailable"));
    expect(classifyPipelineError(err)).toBe("invalid_video");
    expect(isTerminalErrorClass("invalid_video")).toBe(true);
  });

  it("maps blocked and rate-limited fetches as retryable", () => {
    const blocked = new TranscriptUnavailableError("abc", new Error("Sign in to confirm you’re not a bot"));
    const limited = new TranscriptUnavailableError("abc", new Error("Too many requests (429)"));
    expect(classifyPipelineError(blocked)).toBe("blocked");
    expect(classifyPipelineError(limited)).toBe("rate_limited");
    expect(isTerminalErrorClass("blocked")).toBe(false);
  });

  it("maps provider 429 and 5xx", () => {
    expect(classifyPipelineError({ status: 429, message: "rate limit" })).toBe("provider_429");
    expect(classifyPipelineError({ status: 503, message: "unavailable" })).toBe("provider_5xx");
  });

  it("defaults unknown errors to retryable", () => {
    expect(classifyPipelineError(new Error("ECONNRESET"))).toBe("unknown");
    expect(isTerminalErrorClass("unknown")).toBe(false);
  });

  it("backs off 5s, 20s, 80s then caps at 5 minutes", () => {
    const noJitter = () => 0.5;
    expect(retryBackoffSeconds(1, noJitter)).toBe(5);
    expect(retryBackoffSeconds(2, noJitter)).toBe(20);
    expect(retryBackoffSeconds(3, noJitter)).toBe(80);
    expect(retryBackoffSeconds(6, noJitter)).toBe(300);
  });
});
