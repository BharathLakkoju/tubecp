import { describe, expect, it } from "vitest";
import { videoUrlsAsLines } from "@/lib/video-urls";

describe("videoUrlsAsLines", () => {
  it("joins urls with newlines in list order", () => {
    expect(
      videoUrlsAsLines([
        { url: "https://www.youtube.com/watch?v=aaa" },
        { url: "https://www.youtube.com/watch?v=bbb" },
      ])
    ).toBe("https://www.youtube.com/watch?v=aaa\nhttps://www.youtube.com/watch?v=bbb");
  });

  it("returns an empty string for an empty list", () => {
    expect(videoUrlsAsLines([])).toBe("");
  });
});
