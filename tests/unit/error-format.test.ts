import { describe, expect, it } from "vitest";
import { formatUnknownError, isTransientConnectivityError } from "@/lib/error-format";

describe("formatUnknownError", () => {
  it("unwraps ErrorEvent so logs are not [object ErrorEvent]", () => {
    const event = { type: "error", message: "[object ErrorEvent]" };
    expect(formatUnknownError(event)).toBe("Database connection failed");
    expect(isTransientConnectivityError(event)).toBe(true);
  });

  it("unwraps NeonDbError sourceError timeouts", () => {
    const err = Object.assign(new Error("Error connecting to database: TypeError: fetch failed"), {
      sourceError: Object.assign(new TypeError("fetch failed"), {
        cause: { code: "ETIMEDOUT", errors: [new Error("connect timeout")] },
      }),
    });
    expect(formatUnknownError(err)).toMatch(/ETIMEDOUT|fetch failed/);
    expect(isTransientConnectivityError(err)).toBe(true);
  });
});