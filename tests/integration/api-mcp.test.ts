import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store/redis", () => ({
  getRedis: () => null,
}));

import { GET } from "@/app/api/mcp/route";
import { generateMcpApiKey, storeMcpApiKey } from "@/lib/mcp/api-keys";

describe("GET /api/mcp", () => {
  it("returns MCP unauthorized payload instead of web session auth", async () => {
    const res = await GET(new Request("http://localhost/api/mcp"));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.code).toBe("MCP_UNAUTHORIZED");
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
    expect(body.error).not.toBe("Sign in required");
  });

  it("accepts bearer MCP API keys without a web session", async () => {
    const rawKey = generateMcpApiKey();
    await storeMcpApiKey("mcp-test-user", rawKey);

    const res = await GET(
      new Request("http://localhost/api/mcp", {
        headers: { Authorization: `Bearer ${rawKey}` },
      })
    );

    expect(res.status).not.toBe(401);
    const body = await res.text();
    expect(body).not.toContain("AUTH_REQUIRED");
    expect(body).not.toContain("Sign in required");
  });
});
