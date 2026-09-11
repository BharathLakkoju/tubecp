import { test, expect } from "@playwright/test";

test.describe("API authentication", () => {
  test("protected research endpoint returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/research/expand", {
      data: { topic: "test topic" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  test("protected KB endpoint returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/knowledge-base/create", {
      data: { topic: "test", rankedVideos: [] },
    });
    expect(res.status()).toBe(401);
  });

  test("webhook endpoint is reachable without session auth", async ({ request }) => {
    const res = await request.post("/api/webhook/polar", {
      data: {},
      headers: { "content-type": "application/json" },
    });
    // Polar SDK rejects invalid payloads; 503 means webhook secret missing in env
    expect(res.status()).not.toBe(401);
    expect([400, 403, 422, 500, 503]).toContain(res.status());
  });
});
