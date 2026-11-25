import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHostedTranscript } from "@/lib/services/hosted-transcript-api";

const BASE = "https://transcript.example";

describe("fetchHostedTranscript", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses success JSON into a Transcript", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          videoId: "vid-1",
          language: "en",
          transcript: [
            { text: "Hello", start: 1, duration: 2 },
            { text: "  ", start: 3, duration: 1 },
          ],
        }),
      })
    );

    const transcript = await fetchHostedTranscript(BASE, "vid-1");
    expect(transcript.videoId).toBe("vid-1");
    expect(transcript.language).toBe("en");
    expect(transcript.segments).toEqual([{ text: "Hello", start: 1, duration: 2 }]);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://transcript.example/api/video/transcript?videoId=vid-1&format=json",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });

  it("throws with API detail on HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ detail: "This video is private, members-only, age-restricted, or unavailable." }),
      })
    );

    await expect(fetchHostedTranscript(BASE, "vid-x")).rejects.toThrow(/private/);
  });
});