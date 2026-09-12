import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/auth-schemas";
import { resetPasswordWithToken } from "@/lib/password-reset";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid reset request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const success = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  if (!success) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
}
