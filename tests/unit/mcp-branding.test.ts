import { beforeEach, describe, expect, it } from "vitest";
import { getMcpBrandIconUrl, getMcpServerImplementation } from "@/lib/mcp/branding";

describe("mcp branding", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://tubecp.vercel.app";
  });

  it("exposes a public icon URL on the app origin", () => {
    expect(getMcpBrandIconUrl()).toBe("https://tubecp.vercel.app/icon.svg");
  });

  it("includes icons in MCP server implementation metadata", () => {
    const info = getMcpServerImplementation();
    expect(info.title).toBe("TubeCP");
    expect(info.icons?.[0]?.src).toBe("https://tubecp.vercel.app/icon.svg");
  });
});
