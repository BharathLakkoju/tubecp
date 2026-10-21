import { describe, expect, it } from "vitest";
import {
  isKbMirrorResearchId,
  knowledgeBaseIdFromResearchId,
  listableSavedResearches,
} from "@/lib/researches";

describe("researches", () => {
  it("detects kb mirror research ids", () => {
    expect(knowledgeBaseIdFromResearchId("kb:abc-123")).toBe("abc-123");
    expect(isKbMirrorResearchId("kb:abc-123")).toBe(true);
    expect(isKbMirrorResearchId("session-xyz")).toBe(false);
  });

  it("filters kb mirrors from listable researches", () => {
    const items = [
      { researchId: "session-1", topic: "A" },
      { researchId: "kb:uuid-1", topic: "B" },
    ];
    expect(listableSavedResearches(items)).toEqual([{ researchId: "session-1", topic: "A" }]);
  });
});
