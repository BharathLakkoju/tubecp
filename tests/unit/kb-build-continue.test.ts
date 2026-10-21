import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isKbBuildContinuation } from "@/lib/services/kb-build-continue";

describe("isKbBuildContinuation", () => {
  it("accepts only the hmac for that knowledge base", () => {
    process.env.AUTH_SECRET = "test-auth-secret";
    const token = createHmac("sha256", "test-auth-secret").update("kb-build:kb-1").digest("hex");

    expect(isKbBuildContinuation("kb-1", token)).toBe(true);
    expect(isKbBuildContinuation("kb-2", token)).toBe(false);
    expect(isKbBuildContinuation("kb-1", "nope")).toBe(false);
    expect(isKbBuildContinuation("kb-1", null)).toBe(false);
  });
});
