import { afterEach, describe, expect, it } from "vitest";
import { isE2eAuthBypass } from "@/lib/e2e";

describe("isE2eAuthBypass production guard", () => {
  const originalBypass = process.env.E2E_AUTH_BYPASS;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.E2E_AUTH_BYPASS = originalBypass;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("is disabled in production even when env flag is set", () => {
    process.env.E2E_AUTH_BYPASS = "true";
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    expect(isE2eAuthBypass()).toBe(false);
  });

  it("is enabled in development when env flag is set", () => {
    process.env.E2E_AUTH_BYPASS = "true";
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    expect(isE2eAuthBypass()).toBe(true);
  });
});
