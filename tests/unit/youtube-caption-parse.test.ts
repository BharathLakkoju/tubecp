import { describe, expect, it } from "vitest";
import { parseCaptionBody } from "@/lib/services/youtube-caption-fetch";

describe("parseCaptionBody", () => {
  it("parses srv3-style timedtext XML", () => {
    const xml = `<?xml version="1.0"?><timedtext><body><p t="1000" d="2000"><s>Hello</s><s> world</s></p></body></timedtext>`;
    const segments = parseCaptionBody(xml, "en");
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("Hello world");
    expect(segments[0].offset).toBe(1000);
  });

  it("parses json3 caption payloads", () => {
    const json = JSON.stringify({
      events: [
        { tStartMs: 500, dDurationMs: 1500, segs: [{ utf8: "AWS " }, { utf8: "overview" }] },
      ],
    });
    const segments = parseCaptionBody(json, "en");
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("AWS overview");
    expect(segments[0].offset).toBe(500);
  });
});
