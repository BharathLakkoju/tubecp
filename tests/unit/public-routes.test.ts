import { describe, expect, it } from "vitest";
import { isPublicRoute } from "@/lib/public-routes";

describe("isPublicRoute", () => {
  it("allows verify-email without authentication", () => {
    expect(isPublicRoute("/verify-email")).toBe(true);
  });
});
