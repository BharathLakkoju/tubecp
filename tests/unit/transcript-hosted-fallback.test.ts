import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({
  config: { transcriptApiBaseUrl: "https://transcript.example" },
}));

vi.mock("@/lib/store", () => ({
  getCachedTranscript: vi.fn().mockResolvedValue(null),
  cacheTranscript: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/youtube-caption-fetch", () => ({
  fetchYoutubeCaptionSegments: vi.fn(),
}));

vi.mock("@/lib/services/hosted-transcript-api", () => ({
  fetchHostedTranscript: vi.fn(),
}));

import { cacheTranscript } from "@/lib/store";
import { fetchHostedTranscript } from "@/lib/services/hosted-transcript-api";
import { fetchYoutubeCaptionSegments } from "@/lib/services/youtube-caption-fetch";
import { getTranscript, TranscriptUnavailableError } from "@/lib/services/transcript";

describe("getTranscript hosted fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the hosted API when YouTube captions fail transiently", async () => {
    vi.mocked(fetchYoutubeCaptionSegments).mockRejectedValueOnce(
      new Error("YouTube is receiving too many requests")
    );
    vi.mocked(fetchHostedTranscript).mockResolvedValueOnce({
      videoId: "abc123",
      language: "en",
      segments: [{ start: 0, duration: 2, text: "from hosted api" }],
    });

    const transcript = await getTranscript("abc123", { mode: "captions" });

    expect(transcript.segments[0]?.text).toBe("from hosted api");
    expect(fetchHostedTranscript).toHaveBeenCalledWith("https://transcript.example", "abc123");
    expect(cacheTranscript).toHaveBeenCalledWith(transcript, "captions");
  });

  it("does not call the hosted API for permanent caption errors", async () => {
    vi.mocked(fetchYoutubeCaptionSegments).mockRejectedValueOnce(
      new Error("Transcript is disabled on this video")
    );

    await expect(getTranscript("abc123", { mode: "captions" })).rejects.toBeInstanceOf(
      TranscriptUnavailableError
    );
    expect(fetchHostedTranscript).not.toHaveBeenCalled();
  });

  it("falls back to the hosted API when YouTube returns no caption segments", async () => {
    vi.mocked(fetchYoutubeCaptionSegments).mockResolvedValueOnce([]);
    vi.mocked(fetchHostedTranscript).mockResolvedValueOnce({
      videoId: "abc123",
      language: "en",
      segments: [{ start: 5, duration: 2, text: "recovered from hosted" }],
    });

    const transcript = await getTranscript("abc123", { mode: "captions" });

    expect(transcript.segments[0]?.text).toBe("recovered from hosted");
    expect(fetchHostedTranscript).toHaveBeenCalledOnce();
  });

  it("surfaces a permanent hosted error instead of retrying captions", async () => {
    vi.mocked(fetchYoutubeCaptionSegments).mockRejectedValueOnce(new Error("sign in to confirm"));
    vi.mocked(fetchHostedTranscript).mockRejectedValueOnce(
      new Error("This video is private, members-only, age-restricted, or unavailable.")
    );

    await expect(getTranscript("abc123", { mode: "captions" })).rejects.toMatchObject({
      kind: "permanent",
    });
  });
});