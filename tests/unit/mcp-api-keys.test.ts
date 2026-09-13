import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store/redis", () => ({
  getRedis: () => null,
}));

import {
  generateMcpApiKey,
  listMcpApiKeys,
  maskMcpApiKey,
  resolveMcpApiKey,
  revokeMcpApiKeyById,
  storeMcpApiKey,
} from "@/lib/mcp/api-keys";

describe("mcp api keys", () => {

  it("masks keys for display", () => {
    const raw = "tcp_abcdefghijklmnop";
    expect(maskMcpApiKey(raw)).toBe("tcp_abc…mnop");
  });

  it("stores, lists, resolves, and revokes keys", async () => {
    const rawKey = generateMcpApiKey();
    const record = await storeMcpApiKey("user-1", rawKey, "laptop");

    expect(record.label).toBe("laptop");
    expect(record.maskedKey.startsWith("tcp_")).toBe(true);

    const listed = await listMcpApiKeys("user-1");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(record.id);

    const resolved = await resolveMcpApiKey(rawKey);
    expect(resolved?.userId).toBe("user-1");

    const revoked = await revokeMcpApiKeyById("user-1", record.id);
    expect(revoked).toBe(true);
    expect(await listMcpApiKeys("user-1")).toHaveLength(0);
    expect(await resolveMcpApiKey(rawKey)).toBeNull();
  });
});
