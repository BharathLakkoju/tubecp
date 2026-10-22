import { describe, expect, it } from "vitest";
import { parseJsonResponseBody } from "@/lib/client/fetch-json";

describe("parseJsonResponseBody", () => {
  it("throws a friendly message when a non-JSON error body is returned", async () => {
    const res = new Response("<html>Gateway Timeout</html>", { status: 504 });
    await expect(parseJsonResponseBody(res)).rejects.toThrow(
      "Server timed out (HTTP 504). Try again."
    );
  });

  it("parses valid JSON error payloads", async () => {
    const res = new Response(JSON.stringify({ error: "Sign in required" }), { status: 401 });
    const data = await parseJsonResponseBody<{ error: string }>(res);
    expect(data.error).toBe("Sign in required");
  });
});
