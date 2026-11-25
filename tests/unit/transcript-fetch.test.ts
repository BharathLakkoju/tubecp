import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
  getCachedTranscript: vi.fn(async () => null),
  cacheTranscript: vi.fn(async () => undefined),
}));

vi.mock("@/lib/pipeline/config", () => ({
  pipelineLoadStubEnabled: () => false,
}));

vi.mock("@/lib/services/youtube-caption-fetch", () => ({
  fetchYoutubeCaptionSegments: vi.fn(),
}));

vi.mock("@/lib/services/hosted-transcript", () => ({
  hostedTranscriptConfigured: vi.fn(() => false),
  fetchHostedTranscript: vi.fn(),
}));

vi.mock("@/lib/services/youtube-captions-api", () => ({
  youtubeCaptionTrackPresence: vi.fn(),
}));

import { getTranscript, TranscriptUnavailableError } from "@/lib/services/transcript";
import { fetchYoutubeCaptionSegments } from "@/lib/services/youtube-caption-fetch";
import { fetchHostedTranscript, hostedTranscriptConfigured } from "@/lib/services/hosted-transcript";
import { youtubeCaptionTrackPresence } from "@/lib/services/youtube-captions-api";
import { cacheTranscript } from "@/lib/store";

describe("getTranscript caption fallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hostedTranscriptConfigured).mockReturnValue(false);
  });

  it("uses TRANSCRIPT_API_BASE before scraping YouTube", async () => {
    vi.mocked(hostedTranscriptConfigured).mockReturnValue(true);
    vi.mocked(fetchHostedTranscript).mockResolvedValue([
      { text: "From API", offset: 0, duration: 1000, lang: "en" },
    ]);

    const transcript = await getTranscript("vid-1");
    expect(transcript.segments[0]?.text).toBe("From API");
    expect(fetchYoutubeCaptionSegments).not.toHaveBeenCalled();
    expect(cacheTranscript).toHaveBeenCalled();
  });

  it("falls back to YouTube scrape when the hosted API misses", async () => {
    vi.mocked(hostedTranscriptConfigured).mockReturnValue(true);
    vi.mocked(fetchHostedTranscript).mockResolvedValue(null);
    vi.mocked(fetchYoutubeCaptionSegments).mockResolvedValue([
      { text: "From scrape", offset: 0, duration: 1000, lang: "en" },
    ]);

    const transcript = await getTranscript("vid-1");
    expect(transcript.segments[0]?.text).toBe("From scrape");
    expect(fetchYoutubeCaptionSegments).toHaveBeenCalled();
  });

  it("treats scrape misses as retryable when caption tracks exist", async () => {
    vi.mocked(fetchYoutubeCaptionSegments).mockRejectedValue(
      new Error("caption scrape returned no segments")
    );
    vi.mocked(youtubeCaptionTrackPresence).mockResolvedValue("present");

    const err = await getTranscript("vid-1").catch((caught) => caught);
    expect(err).toBeInstanceOf(TranscriptUnavailableError);
    expect((err as TranscriptUnavailableError).kind).toBe("transient");
  });

  it("skips only after captions.list confirms there are no tracks", async () => {
    vi.mocked(fetchYoutubeCaptionSegments).mockResolvedValue([]);
    vi.mocked(youtubeCaptionTrackPresence).mockResolvedValue("absent");

    const err = await getTranscript("vid-1").catch((caught) => caught);
    expect(err).toBeInstanceOf(TranscriptUnavailableError);
    expect((err as TranscriptUnavailableError).kind).toBe("permanent");
  });
});
