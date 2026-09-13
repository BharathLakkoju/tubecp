import { test, expect } from "@playwright/test";

const authHeaders = { "x-e2e-user-id": "1" };

test.describe("Full product flow (stubbed APIs)", () => {
  test("research → build → chat happy path", async ({ request }) => {
    const topic = "cursor ai agents";

    const expandRes = await request.post("/api/research/expand", {
      headers: authHeaders,
      data: { topic },
    });
    expect(expandRes.status()).toBe(200);
    const expandBody = await expandRes.json();
    expect(expandBody.cached).toBe(true);
    expect(expandBody.research?.rankedVideos?.length).toBeGreaterThan(0);

    const buildRes = await request.post("/api/knowledge-base/build", {
      headers: authHeaders,
      data: {
        topic,
        rankedVideos: expandBody.research.rankedVideos,
      },
    });
    expect(buildRes.status()).toBe(200);
    const buildBody = await buildRes.json();
    expect(buildBody.kb?.status).toBe("ready");
    const kbId = buildBody.kb.kbId as string;

    const chatRes = await request.post("/api/chat", {
      headers: authHeaders,
      data: { kbId, message: "What are the key takeaways?" },
    });
    expect(chatRes.status()).toBe(200);

    const chatText = await chatRes.text();
    expect(chatText).toContain("E2E stub");
    expect(chatText).toContain("token");
  });

  test("admin usage endpoint requires admin user", async ({ request }) => {
    const denied = await request.get("/api/admin/usage", {
      headers: { "x-e2e-user-id": "999" },
    });
    expect(denied.status()).toBe(403);

    const allowed = await request.get("/api/admin/usage", {
      headers: authHeaders,
    });
    expect(allowed.status()).toBe(200);
    const body = await allowed.json();
    expect(body.summary).toBeDefined();
    expect(body.youtubeQuota).toBeDefined();
  });
});
