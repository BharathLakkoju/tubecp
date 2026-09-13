import { NextResponse } from "next/server";
import { signOut } from "@/auth";
import { deleteUserAccount, exportUserData } from "@/lib/account";
import { requireUserId, apiError } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const data = await exportUserData(userId);
    const filename = `tubecp-export-${userId}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await deleteUserAccount(userId);
    await signOut({ redirect: false });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
