import { describe, expect, it } from "vitest";
import { oauthSignInErrorMessage } from "@/lib/auth-errors";

describe("oauthSignInErrorMessage", () => {
  it("explains a callback mismatch", () => {
    expect(oauthSignInErrorMessage("OAuthCallback")).toMatch(/Authorized redirect URI/);
  });

  it("returns null when Auth.js did not send an error", () => {
    expect(oauthSignInErrorMessage(undefined)).toBeNull();
  });
});
