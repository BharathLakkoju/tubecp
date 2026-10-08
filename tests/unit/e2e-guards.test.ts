import { afterEach, describe, expect, it } from "vitest";
import { isE2eAuthBypass } from "@/lib/e2e";

describe("isE2eAuthBypass production guard", () => {
  const originalBypass = process.env.E2E_AUTH_BYPASS;
  const originalStubApis = process.env.E2E_STUB_APIS;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.E2E_AUTH_BYPASS = originalBypass;
    process.env.E2E_STUB_APIS = originalStubApis;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("is disabled in production even when env flag is set", () => {
    process.env.E2E_AUTH_BYPASS = "true";
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    delete process.env.E2E_STUB_APIS;
    expect(isE2eAuthBypass()).toBe(false);
  });

  it("is enabled in development when env flag is set", () => {
    process.env.E2E_AUTH_BYPASS = "true";
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.E2E_STUB_APIS;
    expect(isE2eAuthBypass()).toBe(true);
  });

  it("is enabled in production when stub APIs are enabled (Playwright CI)", () => {
    process.env.E2E_AUTH_BYPASS = "true";
    process.env.E2E_STUB_APIS = "true";
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    expect(isE2eAuthBypass()).toBe(true);
  });
});
