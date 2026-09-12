import { NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/auth-schemas";
import { requireUserId, apiError } from "@/lib/auth";
import {
  getUserById,
  updateUserPassword,
  verifyUserPassword,
  hasPasswordAuth,
} from "@/lib/users";

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ hasPassword: hasPasswordAuth(user) });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const user = await getUserById(userId);

    if (!user?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!hasPasswordAuth(user)) {
      return NextResponse.json(
        {
          error:
            "Password change is only available for accounts created with email and password.",
          code: "OAUTH_ACCOUNT",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid password data";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const valid = await verifyUserPassword(user.email, parsed.data.currentPassword);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    await updateUserPassword(userId, parsed.data.newPassword);

    return NextResponse.json({ ok: true, message: "Password updated." });
  } catch (err) {
    return apiError(err);
  }
}
