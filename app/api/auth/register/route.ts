import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/auth-schemas";
import { ensureUserSubscription } from "@/lib/billing/subscription";
import { createUserWithPassword, getUserByEmail, normalizeEmail } from "@/lib/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid registration data";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409 }
    );
  }

  const user = await createUserWithPassword(name, normalizedEmail, password);
  await ensureUserSubscription(String(user.id));

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
      },
    },
    { status: 201 }
  );
}
