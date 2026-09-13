import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns health status and configuration checks", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.platform).toBe("vercel-serverless");
    expect(typeof body.checks.youtubeKey).toBe("boolean");
    expect(typeof body.checks.openrouterKey).toBe("boolean");
    expect(typeof body.checks.kv).toBe("boolean");
    expect(typeof body.checks.databaseUrl).toBe("boolean");
    expect(typeof body.checks.authSecret).toBe("boolean");
    expect(typeof body.checks.oauthProvider).toBe("boolean");
    expect(typeof body.checks.devBypassDisabled).toBe("boolean");
    expect(typeof body.checks.polarProProduct).toBe("boolean");
    expect(typeof body.checks.polarResearcherProduct).toBe("boolean");
    expect(body.checks.youtubeQuota).toMatchObject({
      used: expect.any(Number),
      limit: expect.any(Number),
      warning: expect.any(Boolean),
    });
  });
});
