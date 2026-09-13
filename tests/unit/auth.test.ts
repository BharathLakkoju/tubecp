import { describe, expect, it, afterEach, vi } from "vitest";
import { headers } from "next/headers";
import { apiError, AuthError, requireUserId } from "@/lib/auth";
import { KbAccessError } from "@/lib/kb-access";
import { FeatureGateError, UsageLimitError } from "@/lib/billing/subscription";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("requireUserId", () => {
  const originalBypass = process.env.E2E_AUTH_BYPASS;

  afterEach(() => {
    process.env.E2E_AUTH_BYPASS = originalBypass;
    vi.mocked(headers).mockReset();
  });

  it("requires x-e2e-user-id header in E2E bypass mode", async () => {
    process.env.E2E_AUTH_BYPASS = "true";
    vi.mocked(headers).mockResolvedValue(new Headers());

    await expect(requireUserId()).rejects.toBeInstanceOf(AuthError);
  });

  it("accepts x-e2e-user-id header in E2E bypass mode", async () => {
    process.env.E2E_AUTH_BYPASS = "true";
    vi.mocked(headers).mockResolvedValue(new Headers({ "x-e2e-user-id": "1" }));

    await expect(requireUserId()).resolves.toBe("1");
  });
});

describe("apiError", () => {
  it("maps AuthError to 401", async () => {
    const res = apiError(new AuthError("Sign in required"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("maps KbAccessError to 403", async () => {
    const res = apiError(new KbAccessError("Forbidden"));
    expect(res.status).toBe(403);
  });

  it("maps usage limits to 403", async () => {
    const res = apiError(new UsageLimitError("limit"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("USAGE_LIMIT");
  });

  it("maps feature gate to 403", async () => {
    const res = apiError(new FeatureGateError("upgrade"));
    const body = await res.json();
    expect(body.code).toBe("FEATURE_GATE");
  });

  it("maps unknown errors to 500 with detail in development", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const res = apiError(new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
    expect(body.detail).toBeDefined();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("omits error detail outside development", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const res = apiError(new Error("boom"));
    const body = await res.json();
    expect(body.detail).toBeUndefined();
    process.env.NODE_ENV = originalNodeEnv;
  });
});
