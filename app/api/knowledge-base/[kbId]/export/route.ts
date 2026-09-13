import { NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { exportKnowledgeBase } from "@/lib/services/kb-export";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    await assertKbAccess(kbId, userId);

    const data = await exportKnowledgeBase(kbId, userId);
    const filename = `tubecp-kb-${kbId}-${new Date().toISOString().slice(0, 10)}.json`;

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
