import { describe, expect, it } from "vitest";
import {
  checkoutPathForPlan,
  isCheckoutCallback,
  resolveAuthCallbackUrl,
  safeCallbackPath,
  signInPathForCheckout,
} from "@/lib/billing/checkout-flow";

describe("checkout-flow", () => {
  it("builds checkout paths for paid plans", () => {
    expect(checkoutPathForPlan("pro")).toBe("/api/checkout?plan=pro");
    expect(checkoutPathForPlan("researcher")).toBe("/api/checkout?plan=researcher");
  });

  it("resolves auth callback from plan param", () => {
    expect(resolveAuthCallbackUrl({ plan: "pro" })).toBe("/api/checkout?plan=pro");
  });

  it("resolves auth callback from callbackUrl param", () => {
    expect(resolveAuthCallbackUrl({ callbackUrl: "/api/checkout?plan=researcher" })).toBe(
      "/api/checkout?plan=researcher"
    );
  });

  it("rejects unsafe callback paths", () => {
    expect(safeCallbackPath("https://evil.test")).toBe("/app");
    expect(safeCallbackPath("//evil.test")).toBe("/app");
    expect(safeCallbackPath("/pricing")).toBe("/app");
  });

  it("builds sign-in path preserving checkout intent", () => {
    expect(signInPathForCheckout("pro")).toBe(
      "/sign-in?callbackUrl=%2Fapi%2Fcheckout%3Fplan%3Dpro"
    );
  });

  it("detects checkout callbacks", () => {
    expect(isCheckoutCallback("/api/checkout?plan=pro")).toBe(true);
    expect(isCheckoutCallback("/app")).toBe(false);
  });
});
