import { NextResponse } from "next/server";
import { z } from "zod";
import { EmailDeliveryError } from "@/lib/email";
import { sendEmailVerification } from "@/lib/email-verification";
import { getUserByEmail, hasPasswordAuth, normalizeEmail } from "@/lib/users";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await getUserByEmail(email);

  if (!user || !hasPasswordAuth(user)) {
    return NextResponse.json({ ok: true });
  }

  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  try {
    await sendEmailVerification(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EmailDeliveryError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 503 });
    }
    throw err;
  }
}
