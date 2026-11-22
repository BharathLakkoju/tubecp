import { afterEach, describe, expect, it } from "vitest";
import {
  applyCanonicalAuthUrl,
  getAppUrl,
  getAuthJsBaseUrl,
  getOAuthCallbackUrl,
} from "@/lib/app-url";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getAppUrl", () => {
  it("prefers configured public URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://tubecp.vercel.app";
    delete process.env.VERCEL_URL;
    expect(getAppUrl()).toBe("https://tubecp.vercel.app");
  });

  it("falls back to VERCEL_URL when production env uses a local placeholder", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "http://local";
    process.env.VERCEL_URL = "tubecp.vercel.app";
    expect(getAppUrl()).toBe("https://tubecp.vercel.app");
  });

  it("upgrades http public app URLs to https", () => {
    process.env.AUTH_URL = "http://tubecp.vercel.app";
    delete process.env.VERCEL_URL;
    expect(getAppUrl()).toBe("https://tubecp.vercel.app");
  });

  it("pins AUTH_URL away from a leftover localhost value on Vercel production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.VERCEL_URL = "tubecp.vercel.app";
    expect(applyCanonicalAuthUrl()).toBe("https://tubecp.vercel.app");
    expect(process.env.AUTH_URL).toBe("https://tubecp.vercel.app");
    expect(getOAuthCallbackUrl("google")).toBe(
      "https://tubecp.vercel.app/api/auth/callback/google"
    );
    expect(getAuthJsBaseUrl()).toBe("https://tubecp.vercel.app/api/auth");
  });
});
