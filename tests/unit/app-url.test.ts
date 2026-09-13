import { afterEach, describe, expect, it } from "vitest";
import { getAppUrl } from "@/lib/app-url";

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
});
