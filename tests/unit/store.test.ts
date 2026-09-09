import { describe, expect, it } from "vitest";
import { hashTopic } from "@/lib/store";

describe("hashTopic", () => {
  it("returns stable hash for same topic", () => {
    const topic = "React Server Components";
    expect(hashTopic(topic)).toBe(hashTopic(topic));
  });

  it("is case-sensitive", () => {
    expect(hashTopic("Topic")).not.toBe(hashTopic("topic"));
  });

  it("differs for different topics", () => {
    expect(hashTopic("topic a")).not.toBe(hashTopic("topic b"));
  });
});
