import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ResearchLiveView from "@/components/ResearchLiveView";
import ResearchResults from "@/components/ResearchResults";
import type { RankedVideo, ResearchResult, VideoSummary } from "@/lib/types";

const searched: VideoSummary = {
  videoId: "searched-1",
  title: "Searched video",
  channel: "Channel",
  url: "https://www.youtube.com/watch?v=searched-1",
  thumbnailUrl: "https://i.ytimg.com/vi/searched-1/hqdefault.jpg",
};

const ranked: RankedVideo = {
  ...searched,
  videoId: "ranked-1",
  title: "Ranked video",
  url: "https://www.youtube.com/watch?v=ranked-1",
  thumbnailUrl: "https://i.ytimg.com/vi/ranked-1/hqdefault.jpg",
  relevanceScore: 80,
  whyRelevant: "On topic",
  discussionLevel: "substantial",
};

const noop = () => {};

function markup(result: ResearchResult, rankedVideos: RankedVideo[]) {
  return renderToStaticMarkup(
    createElement(ResearchResults, {
      research: result,
      ranked: rankedVideos,
      selectable: false,
      selectedIds: new Set<string>(),
      onToggle: noop,
      onSelectTop: noop,
      onSelectAll: noop,
      onClear: noop,
      topCount: 0,
    })
  );
}

describe("ResearchResults copy actions", () => {
  it("offers analyzed and searched copy actions when both lists have videos", () => {
    const html = markup(
      {
        topic: "sourdough",
        queriesUsed: [],
        videosSearched: 2,
        allVideos: [searched, ranked],
        rankedVideos: [ranked],
      },
      [ranked]
    );
    expect(html).toContain("Copy analyzed links");
    expect(html).toContain("Copy searched links");
    expect(html).toContain("Copy video links");
    expect(html).not.toContain("Copy all links");
  });

  it("still offers searched copy when nothing was analyzed", () => {
    const html = markup(
      {
        topic: "sourdough",
        queriesUsed: [],
        videosSearched: 1,
        allVideos: [searched],
        rankedVideos: [],
      },
      []
    );
    expect(html).not.toContain("Copy analyzed links");
    expect(html).toContain("Copy searched links");
    expect(html).not.toContain("Copy all links");
  });
});

describe("ResearchLiveView copy actions", () => {
  it("offers searched copy while videos are still being found", () => {
    const html = renderToStaticMarkup(
      createElement(ResearchLiveView, {
        live: {
          queries: ["sourdough"],
          allVideos: [searched],
          analyzedVideos: [],
          analyzedScores: {},
        },
      })
    );
    expect(html).toContain("Copy searched links");
    expect(html).not.toContain("Copy analyzed links");
  });
});
