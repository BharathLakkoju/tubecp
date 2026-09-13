import { describe, expect, it } from "vitest";
import { formatDisplayDate } from "@/lib/format-display-date";

describe("formatDisplayDate", () => {
  it("formats dates deterministically for SSR", () => {
    expect(formatDisplayDate("2100-12-31T23:59:59.999Z")).toBe("December 31, 2100");
  });

  it("returns em dash for missing or invalid values", () => {
    expect(formatDisplayDate()).toBe("—");
    expect(formatDisplayDate("not-a-date")).toBe("—");
  });
});
