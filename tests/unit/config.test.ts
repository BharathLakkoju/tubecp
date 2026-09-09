import { describe, expect, it, afterEach } from "vitest";
import { isLicenseValid } from "@/lib/config";

describe("isLicenseValid", () => {
  const original = process.env.LICENSE_KEY;

  afterEach(() => {
    process.env.LICENSE_KEY = original;
  });

  it("allows all when LICENSE_KEY is unset", () => {
    process.env.LICENSE_KEY = "";
    expect(isLicenseValid()).toBe(true);
    expect(isLicenseValid("anything")).toBe(true);
  });

  it("requires matching key when LICENSE_KEY is set", () => {
    process.env.LICENSE_KEY = "secret-key";
    expect(isLicenseValid("secret-key")).toBe(true);
    expect(isLicenseValid("wrong")).toBe(false);
    expect(isLicenseValid()).toBe(false);
  });
});
