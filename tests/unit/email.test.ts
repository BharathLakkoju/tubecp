import { afterEach, describe, expect, it } from "vitest";
import { EmailDeliveryError, sendPasswordResetEmail } from "@/lib/email";

describe("email delivery", () => {
  const originalResend = process.env.RESEND_API_KEY;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.RESEND_API_KEY = originalResend;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("throws EmailDeliveryError in production when Resend is missing", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "production";

    await expect(
      sendPasswordResetEmail("user@example.com", "https://example.com/reset")
    ).rejects.toBeInstanceOf(EmailDeliveryError);
  });
});
