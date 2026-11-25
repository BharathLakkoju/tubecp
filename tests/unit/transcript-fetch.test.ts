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

  it("uses a hosted transcript API when YouTube scrape is empty", async () => {
    vi.mocked(fetchYoutubeCaptionSegments).mockRejectedValue(
      new Error("caption scrape returned no segments")
    );
    vi.mocked(hostedTranscriptConfigured).mockReturnValue(true);
    vi.mocked(fetchHostedTranscript).mockResolvedValue([
      { text: "From API", offset: 0, duration: 1000, lang: "en" },
    ]);

    const transcript = await getTranscript("vid-1");
    expect(transcript.segments[0]?.text).toBe("From API");
    expect(cacheTranscript).toHaveBeenCalled();
    expect(youtubeCaptionTrackPresence).not.toHaveBeenCalled();
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
