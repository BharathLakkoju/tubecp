import { afterEach, describe, expect, it } from "vitest";
import {
  getConfiguredOAuthProviders,
  missingOAuthEnv,
  oauthProvidersToShow,
} from "@/lib/auth-providers";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("oauthProvidersToShow", () => {
  it("shows Google and GitHub locally even when env is missing", () => {
    process.env.NODE_ENV = "development";
    expect(oauthProvidersToShow([])).toEqual(["google", "github"]);
  });

  it("hides unconfigured providers in production", () => {
    process.env.NODE_ENV = "production";
    expect(oauthProvidersToShow([])).toEqual([]);
    expect(oauthProvidersToShow(["google"])).toEqual(["google"]);
  });
});

describe("getConfiguredOAuthProviders", () => {
  it("requires both client id and secret", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    expect(getConfiguredOAuthProviders()).toEqual([]);
    expect(missingOAuthEnv("google")).toMatch(/GOOGLE_CLIENT_SECRET/);
  });
});
