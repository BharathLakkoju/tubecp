import { test, expect } from "@playwright/test";

const authHeaders = { "x-e2e-user-id": "1" };

test.describe("Authenticated research flow", () => {
  test("expand returns cached stub research in E2E mode", async ({ request }) => {
    const res = await request.post("/api/research/expand", {
      headers: authHeaders,
      data: { topic: "cursor ai agents" },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(true);
    expect(body.researchSessionId).toBeTruthy();
    expect(body.research?.topic).toBe("cursor ai agents");
    expect(body.research?.rankedVideos?.length).toBeGreaterThan(0);
  });

  test("search requires research session", async ({ request }) => {
    const res = await request.post("/api/research/search", {
      headers: authHeaders,
      data: { topic: "test", queries: ["test query"] },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("RESEARCH_SESSION_REQUIRED");
  });
});

test.describe("Authenticated knowledge base flow", () => {
  test("build rejects missing ranked videos", async ({ request }) => {
    const res = await request.post("/api/knowledge-base/build", {
      headers: authHeaders,
      data: { topic: "test topic" },
    });

    expect(res.status()).toBe(400);
  });

  test("kb export requires valid kb id", async ({ request }) => {
    const res = await request.get("/api/knowledge-base/nonexistent-kb/export", {
      headers: authHeaders,
    });

    expect([403, 404]).toContain(res.status());
  });
});

test.describe("Authenticated chat flow", () => {
  test("chat rejects missing message", async ({ request }) => {
    const res = await request.post("/api/chat", {
      headers: authHeaders,
      data: { kbId: "missing-kb" },
    });

    expect([400, 401]).toContain(res.status());
  });

  test("chat messages endpoint requires auth", async ({ request }) => {
    const res = await request.get("/api/knowledge-base/some-kb/messages");
    expect(res.status()).toBe(401);
  });
});

test.describe("Health checks", () => {
  test("health reports polar product configuration", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.checks).toBeDefined();
    expect(body.checks).toHaveProperty("polarProProduct");
    expect(body.checks).toHaveProperty("polarResearcherProduct");
    expect(body.checks.youtubeQuota).toBeDefined();
  });
});
