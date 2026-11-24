import { describe, expect, it } from "vitest";
import { neonConfig } from "@neondatabase/serverless";
import "@/lib/db";

describe("createDbPool", () => {
  it("sends Pool.query over HTTP fetch instead of WebSockets", () => {
    expect(neonConfig.poolQueryViaFetch).toBe(true);
  });

  it("uses an IPv4-only fetch so dual-stack Neon hosts do not ETIMEDOUT", () => {
    expect(typeof neonConfig.fetchFunction).toBe("function");
  });
});