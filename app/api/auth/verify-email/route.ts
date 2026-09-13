import { NextRequest, NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/lib/email-verification";
import { rateLimitByIp, RateLimitError } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    await rateLimitByIp(request, "auth-verify-email", 20);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 429 });
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const verified = await verifyEmailWithToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
