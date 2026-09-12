import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/auth-schemas";
import { requestPasswordReset } from "@/lib/password-reset";
import { RateLimitError, rateLimitApi } from "@/lib/ratelimit";

const GENERIC_MESSAGE =
  "If an email-and-password account exists for that address, we sent a reset link. Check your inbox.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid email";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await rateLimitApi(parsed.data.email.toLowerCase(), "forgot-password", 5);
    await requestPasswordReset(parsed.data.email);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("Forgot password error:", err);
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
