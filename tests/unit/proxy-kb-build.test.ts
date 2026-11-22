import { describe, expect, it } from "vitest";
import { isPublicRoute } from "@/lib/public-routes";

describe("Inngest serve route", () => {
  it("allows Inngest to reach /api/inngest without a user session", () => {
    expect(isPublicRoute("/api/inngest")).toBe(true);
  });

  it("still protects knowledge-base APIs", () => {
    expect(isPublicRoute("/api/knowledge-base/build")).toBe(false);
    expect(isPublicRoute("/api/knowledge-base/kb-1/kick-build")).toBe(false);
  });
});
