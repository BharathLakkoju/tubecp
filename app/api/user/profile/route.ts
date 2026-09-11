import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createDbPool } from "@/lib/db";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid profile data";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const pool = createDbPool();
  await pool.query(`UPDATE users SET name = $1 WHERE id = $2`, [
    parsed.data.name,
    session.user.id,
  ]);

  return NextResponse.json({ ok: true, name: parsed.data.name });
}
