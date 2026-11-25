import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KnowledgeBaseRecord } from "@/lib/types";

const afterMock = vi.hoisted(() => vi.fn());
const unpublishMock = vi.hoisted(() => vi.fn());
const purgeMock = vi.hoisted(() => vi.fn());
const requireUserIdMock = vi.hoisted(() => vi.fn());
const assertKbAccessMock = vi.hoisted(() => vi.fn());

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: afterMock };
});

vi.mock("@/lib/auth", () => ({
  requireUserId: (...args: unknown[]) => requireUserIdMock(...args),
  apiError: (err: unknown) => {
    throw err;
  },
}));

vi.mock("@/lib/kb-access", () => ({
  assertKbAccess: (...args: unknown[]) => assertKbAccessMock(...args),
}));

vi.mock("@/lib/observe", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/kb/progress", () => ({
  withJobProgress: async (kb: KnowledgeBaseRecord) => kb,
}));

vi.mock("@/lib/services/knowledge-base", () => ({
  unpublishKnowledgeBase: (...args: unknown[]) => unpublishMock(...args),
  purgeKnowledgeBaseAssets: (...args: unknown[]) => purgeMock(...args),
}));

import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/knowledge-base/[kbId]/route";

const kb: KnowledgeBaseRecord = {
  kbId: "kb-route-1",
  topic: "Route proof",
  videoIds: ["vid-1"],
  chunkIds: ["chunk-1"],
  chunksIndexed: 1,
  videosIndexed: 1,
  totalMinutes: 1,
  status: "ready",
  createdAt: new Date().toISOString(),
  userId: "user-1",
};

describe("DELETE /api/knowledge-base/[kbId]", () => {
  beforeEach(() => {
    afterMock.mockReset();
    unpublishMock.mockReset();
    purgeMock.mockReset();
    requireUserIdMock.mockReset();
    assertKbAccessMock.mockReset();
    requireUserIdMock.mockResolvedValue("user-1");
    assertKbAccessMock.mockResolvedValue(kb);
    unpublishMock.mockResolvedValue(undefined);
    purgeMock.mockResolvedValue(undefined);
  });

  it("returns after unpublish and only then runs purge via after()", async () => {
    const order: string[] = [];
    let pendingPurge: (() => unknown) | undefined;
    unpublishMock.mockImplementation(async () => {
      order.push("unpublish");
    });
    afterMock.mockImplementation((fn: () => unknown) => {
      order.push("after-register");
      pendingPurge = fn;
    });
    purgeMock.mockImplementation(async () => {
      order.push("purge");
    });

    const res = await DELETE(new NextRequest("http://localhost/api/knowledge-base/kb-route-1"), {
      params: Promise.resolve({ kbId: "kb-route-1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(order).toEqual(["unpublish", "after-register"]);
    expect(purgeMock).not.toHaveBeenCalled();

    await pendingPurge?.();
    expect(order).toEqual(["unpublish", "after-register", "purge"]);
    expect(purgeMock).toHaveBeenCalledWith(kb);
  });
});
