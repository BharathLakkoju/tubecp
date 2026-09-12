import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/auth-schemas";
import { hasPasswordAuth } from "@/lib/users";

describe("hasPasswordAuth", () => {
  it("is true only when a password hash exists", () => {
    expect(hasPasswordAuth({ password: "hashed" })).toBe(true);
    expect(hasPasswordAuth({ password: null })).toBe(false);
    expect(hasPasswordAuth(null)).toBe(false);
  });
});

describe("password auth schemas", () => {
  it("validates change password payload", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short new passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("validates forgot password email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "user@example.com" }).success).toBe(true);
  });

  it("validates reset password token payload", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc123",
      password: "new-password",
    });
    expect(result.success).toBe(true);
  });
});
