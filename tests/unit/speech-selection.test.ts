import { describe, expect, it } from "vitest";
import { queueForReading } from "@/lib/services/recall";
import { judge, orderSelection, parseModelReading } from "@/lib/services/selection";
import { recallQueries } from "@/lib/services/query-expansion";
import { getResearchPipelineLimits } from "@/lib/research-limits";
import type { VideoCandidate } from "@/lib/types";

function video(
  videoId: string,
  matches: VideoCandidate["matches"],
  searchRank = 10
): VideoCandidate {
  return {
    videoId,
    title: videoId,
    channel: "c",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: "",
    searchRank,
    matches,
  };
}

describe("recall queries", () => {
  it("adds a name query and a subject query that do not repeat the whole topic", () => {
    const queries = recallQueries("lauren tan workflows and agentic development practices");
    expect(queries.map((query) => query.text)).toEqual([
      "lauren tan",
      "workflows agentic development practices",
    ]);
    expect(recallQueries("how do i make profitable apps solo")).toEqual([]);
  });
});

describe("read queue", () => {
  it("reads a silent subject hit before a name-only hit and does not use the title", () => {
    const limits = getResearchPipelineLimits("free");
    const queue = queueForReading(
      [
        video("name-only", [{ query: "lauren tan", kind: "name", rank: 1 }], 1),
        video("silent", [{ query: "workflows agentic", kind: "subject", rank: 40 }], 40),
      ],
      limits
    );
    expect(queue.toRead.map((item) => item.videoId)[0]).toBe("silent");
  });
});

describe("judge", () => {
  const summary = {
    videoId: "v",
    title: "How to cook pasta",
    channel: "c",
    url: "https://www.youtube.com/watch?v=v",
    thumbnailUrl: "",
  };

  function reading(body: unknown) {
    const parsed = parseModelReading(JSON.stringify(body));
    if (!parsed) throw new Error("reading did not parse");
    return parsed;
  }

  it("selects substantial speech with a quote and rejects a mention", () => {
    const selected = judge(
      reading({
        discussesTopic: true,
        discussion: "substantial",
        why: "The speaker explains the workflow.",
        evidence: [{ timestamp: 90, text: "This workflow is the point" }],
      })
    );
    expect(selected).toMatchObject({ state: "selected" });

    const mention = judge(
      reading({
        discussesTopic: true,
        discussion: "mentioned",
        why: "The name appears once.",
        evidence: [{ timestamp: 10, text: "Thanks Lauren" }],
      })
    );
    expect(mention).toMatchObject({ state: "rejected", reason: "mention_only" });
  });

  it("does not select a discussion that has no quote", () => {
    const failed = judge(
      reading({
        discussesTopic: true,
        discussion: "brief",
        why: "Maybe.",
        evidence: [],
      })
    );
    expect(failed).toBe("model_failed");
  });

  it("keeps a selected video and a skipped video in different lists", () => {
    const result = orderSelection({
      topic: "agent workflows",
      queriesUsed: ["agent workflows"],
      videosSearched: 2,
      allVideos: [],
      assessments: [
        {
          state: "selected",
          video: summary,
          discussion: "brief",
          why: "The transcript covers it.",
          evidence: [{ timestamp: 3, text: "Here is the workflow" }],
        },
      ],
      pastAnalyzeCap: [
        video("later", [{ query: "agent workflows", kind: "topic", rank: 80 }], 80),
      ],
      pastSearchCap: [],
      maxResults: 15,
    });
    expect(result.rankedVideos.map((item) => item.videoId)).toEqual(["v"]);
    expect(result.skipped?.[0]).toMatchObject({
      reason: "over_analyze_cap",
      video: { videoId: "later" },
    });
    expect(result.speechSelection).toBe(true);
  });
});
