import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns ok status and platform metadata", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.platform).toBe("vercel-serverless");
    expect(typeof body.hasYoutubeKey).toBe("boolean");
    expect(typeof body.hasOpenRouterKey).toBe("boolean");
    expect(typeof body.hasKv).toBe("boolean");
  });
});
