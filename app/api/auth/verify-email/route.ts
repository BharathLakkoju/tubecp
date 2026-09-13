import { NextRequest, NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/lib/email-verification";

export async function POST(request: NextRequest) {
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
