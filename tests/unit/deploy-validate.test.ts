import { describe, expect, it } from "vitest";
import { runDeployChecks, validateRemoteHealth } from "@/lib/deploy/validate";

describe("runDeployChecks", () => {
  it("flags missing required production variables", () => {
    const result = runDeployChecks({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
    });

    expect(result.ready).toBe(false);
    expect(result.errors.some((check) => check.id === "youtube_api_key")).toBe(true);
    expect(result.errors.some((check) => check.id === "database_url")).toBe(true);
  });

  it("passes when required production variables are set", () => {
    const result = runDeployChecks({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      YOUTUBE_API_KEY: "yt-key",
      OPENROUTER_API_KEY: "or-key",
      DATABASE_URL: "postgres://localhost/db",
      AUTH_SECRET: "secret",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "token",
      RESEND_API_KEY: "re-key",
      EMAIL_FROM: "noreply@example.com",
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
      POLAR_ACCESS_TOKEN: "polar",
      POLAR_WEBHOOK_SECRET: "whsec",
      POLAR_PRODUCT_ID_PRO: "prod_pro",
    });

    expect(result.ready).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects dev bypass flags in production", () => {
    const result = runDeployChecks({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      E2E_AUTH_BYPASS: "true",
      DEV_BYPASS_USAGE_LIMITS: "true",
      YOUTUBE_API_KEY: "yt-key",
      OPENROUTER_API_KEY: "or-key",
      DATABASE_URL: "postgres://localhost/db",
      AUTH_SECRET: "secret",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "token",
      RESEND_API_KEY: "re-key",
      EMAIL_FROM: "noreply@example.com",
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
      POLAR_ACCESS_TOKEN: "polar",
      POLAR_WEBHOOK_SECRET: "whsec",
      POLAR_PRODUCT_ID_PRO: "prod_pro",
    });

    expect(result.ready).toBe(false);
    expect(result.errors.some((check) => check.id === "e2e_bypass_disabled")).toBe(true);
    expect(result.errors.some((check) => check.id === "usage_bypass_disabled")).toBe(true);
  });
});

describe("validateRemoteHealth", () => {
  it("accepts a healthy remote deployment", () => {
    const result = validateRemoteHealth({
      status: "ok",
      platform: "vercel-serverless",
      checks: {
        youtubeKey: true,
        openrouterKey: true,
        databaseUrl: true,
        authSecret: true,
        appUrl: true,
        kv: true,
        resendKey: true,
        emailFrom: true,
        oauthProvider: true,
        polarAccessToken: true,
        polarWebhookSecret: true,
        polarProProduct: true,
        polarResearcherProduct: false,
        devBypassDisabled: true,
        youtubeQuota: { used: 100, limit: 10000, warning: false },
      },
    });

    expect(result.ready).toBe(true);
  });

  it("rejects degraded remote health", () => {
    const result = validateRemoteHealth({
      status: "degraded",
      platform: "vercel-serverless",
      checks: {
        youtubeKey: false,
        openrouterKey: true,
        kv: true,
        resendKey: true,
        polarProProduct: true,
        youtubeQuota: { used: 0, limit: 10000, warning: false },
      },
    });

    expect(result.ready).toBe(false);
    expect(result.errors.some((check) => check.id === "health_status")).toBe(true);
    expect(result.errors.some((check) => check.id === "remote_youtubeKey")).toBe(true);
  });
});
