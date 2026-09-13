import { describe, expect, it } from "vitest";
import { parseClientError, RESEARCH_RETRY_MESSAGE } from "@/lib/client/chat";

describe("parseClientError", () => {
  it("maps internal server errors to the research retry message", () => {
    expect(parseClientError(new Error("Internal server error"))).toBe(RESEARCH_RETRY_MESSAGE);
    expect(parseClientError(new Error("Error: Internal server error"))).toBe(
      RESEARCH_RETRY_MESSAGE
    );
  });

  it("maps OpenRouter rate limits to the research retry message", () => {
    expect(
      parseClientError(new Error("OpenRouter 429: Rate limit exceeded"))
    ).toBe(RESEARCH_RETRY_MESSAGE);
  });
});
