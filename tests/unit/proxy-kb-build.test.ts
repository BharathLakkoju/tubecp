import { describe, expect, it } from "vitest";
import {
  allowsKbBuildContinuationThroughProxy,
  isKbBuildKickBuildPath,
} from "@/lib/services/kb-build-continue";

describe("KB build kick-build proxy bypass", () => {
  it("matches kick-build API paths", () => {
    expect(isKbBuildKickBuildPath("/api/knowledge-base/kb-1/kick-build")).toBe(true);
    expect(isKbBuildKickBuildPath("/api/knowledge-base/kb-1/build-status")).toBe(false);
    expect(isKbBuildKickBuildPath("/api/knowledge-base/kick-build")).toBe(false);
  });

  it("allows unauthenticated access only when the continuation header is present", () => {
    const path = "/api/knowledge-base/kb-1/kick-build";
    expect(allowsKbBuildContinuationThroughProxy(path, "deadbeef")).toBe(true);
    expect(allowsKbBuildContinuationThroughProxy(path, null)).toBe(false);
    expect(allowsKbBuildContinuationThroughProxy("/api/research/search", "deadbeef")).toBe(false);
  });
});
