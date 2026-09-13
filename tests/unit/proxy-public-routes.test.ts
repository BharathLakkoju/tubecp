import { describe, expect, it } from "vitest";
import { isPublicRoute } from "@/lib/public-routes";

describe("isPublicRoute", () => {
  it("allows MCP and docs without a web session", () => {
    expect(isPublicRoute("/api/mcp")).toBe(true);
    expect(isPublicRoute("/docs/mcp")).toBe(true);
    expect(isPublicRoute("/.well-known/oauth-authorization-server")).toBe(true);
  });

  it("still protects product routes", () => {
    expect(isPublicRoute("/app")).toBe(false);
    expect(isPublicRoute("/api/research/search")).toBe(false);
  });
});
