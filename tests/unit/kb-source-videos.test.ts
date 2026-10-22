import { describe, expect, it } from "vitest";
import {
  displaySkipReason,
  listKbNotIndexedVideos,
  youtubeWatchUrl,
} from "@/lib/client/kb-source-videos";
import type { RankedVideo } from "@/lib/types";

const video = (id: string): RankedVideo => ({
  videoId: id,
  title: `Title ${id}`,
  channel: "Channel",
  url: `https://www.youtube.com/watch?v=${id}`,
  thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  relevanceScore: 80,
  whyRelevant: "Relevant",
  discussionLevel: "brief",
});

describe("kb-source-videos", () => {
  it("builds a watch URL from video id", () => {
    expect(youtubeWatchUrl({ videoId: "abc123" })).toBe(
      "https://www.youtube.com/watch?v=abc123"
    );
  });

  it("strips duplicated titles from skip reason copy", () => {
    const title = "Agentic Context Engineering (ACE)";
    expect(
      displaySkipReason(`"${title}" skipped — Transcript unavailable or indexing failed.`, title)
    ).toBe("Transcript unavailable or indexing failed.");
  });

  it("lists not-indexed videos with skip reasons", () => {
    const rows = listKbNotIndexedVideos(
      [video("a"), video("b")],
      ["a"],
      [{ videoId: "b", title: "Title b", reason: "No transcript" }]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].video.videoId).toBe("b");
    expect(rows[0].skipped).toBe(true);
    expect(rows[0].reason).toBe("No transcript");
  });
});
