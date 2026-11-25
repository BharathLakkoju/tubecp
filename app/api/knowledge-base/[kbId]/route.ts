import { after, NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { withJobProgress } from "@/lib/kb/progress";
import { captureException } from "@/lib/observe";
import { purgeKnowledgeBaseAssets, unpublishKnowledgeBase } from "@/lib/services/knowledge-base";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    const kb = await assertKbAccess(kbId, userId);
    return NextResponse.json(await withJobProgress(kb));
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    const kb = await assertKbAccess(kbId, userId);
    await unpublishKnowledgeBase(kb, userId);
    after(() =>
      purgeKnowledgeBaseAssets(kb).catch((err) => {
        captureException(err, { kbId, stage: "kbDeletePurge" });
      })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
