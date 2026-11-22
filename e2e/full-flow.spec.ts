import { test, expect } from "@playwright/test";

const authHeaders = { "x-e2e-user-id": "1" };

test.describe("Full product flow (stubbed APIs)", () => {
  test("research → build → chat happy path", async ({ request }) => {
    const topic = "cursor ai agents";

    const researchRes = await request.post("/api/research", {
      headers: authHeaders,
      data: { topic },
    });
    expect(researchRes.status()).toBe(200);
    const researchLines = (await researchRes.text())
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { type?: string; research?: { rankedVideos?: unknown[] } });
    const done = researchLines.find((event) => event.type === "done");
    expect(done?.research?.rankedVideos?.length).toBeGreaterThan(0);

    const buildRes = await request.post("/api/knowledge-base/build", {
      headers: authHeaders,
      data: {
        topic,
        rankedVideos: done?.research?.rankedVideos,
      },
    });
    expect([200, 202]).toContain(buildRes.status());
    const buildBody = await buildRes.json();
    const kbId = buildBody.kb.kbId as string;

    const statusRes = await request.get(`/api/knowledge-base/${kbId}/build-status`, {
      headers: authHeaders,
    });
    expect(statusRes.status()).toBe(200);
    const statusBody = await statusRes.json();
    expect(statusBody.status).toBe("ready");

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
