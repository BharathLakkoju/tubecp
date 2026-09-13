import { isDevelopment } from "@/lib/env";

const DEFAULT_FROM = "Tubecp <onboarding@resend.dev>";

export class EmailDeliveryError extends Error {
  code = "EMAIL_DELIVERY_UNAVAILABLE";

  constructor(message = "Email delivery is not configured. Please contact support.") {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  devLogLabel: string,
  devUrl?: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;

  if (!apiKey) {
    if (isDevelopment()) {
      console.log(`[${devLogLabel}] ${to}${devUrl ? ` → ${devUrl}` : ""}`);
      return;
    }
    console.error(`RESEND_API_KEY is not configured — ${devLogLabel} email not sent.`);
    throw new EmailDeliveryError();
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Failed to send ${devLogLabel} email:`, detail);
    throw new EmailDeliveryError("Failed to send email. Please try again later.");
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  await sendEmail(
    to,
    "Verify your Tubecp email",
    `
      <p>Thanks for signing up for Tubecp.</p>
      <p><a href="${verifyUrl}">Verify your email address</a></p>
      <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
    `,
    "email-verify",
    verifyUrl
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail(
    to,
    "Reset your Tubecp password",
    `
      <p>You requested a password reset for your Tubecp account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `,
    "password-reset",
    resetUrl
  );
}
