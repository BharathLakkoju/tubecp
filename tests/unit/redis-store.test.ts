import { describe, expect, it } from "vitest";
import { readStoredValue } from "@/lib/store/redis";

describe("readStoredValue", () => {
  it("parses JSON strings", () => {
    expect(readStoredValue<{ id: string }>('{"id":"client-1"}')).toEqual({ id: "client-1" });
  });

  it("returns already-parsed objects from Upstash", () => {
    expect(readStoredValue<{ id: string }>({ id: "client-1" })).toEqual({ id: "client-1" });
  });

  it("returns null for missing or invalid values", () => {
    expect(readStoredValue(null)).toBeNull();
    expect(readStoredValue("not-json")).toBeNull();
  });
});
