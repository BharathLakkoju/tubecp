import { NextRequest, NextResponse } from "next/server";
import { chatWithKnowledgeBase } from "@/lib/services/chat";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { checkAndIncrementUsage } from "@/lib/billing/subscription";
import { rateLimitApi } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "chat", 30);

    const { kbId, message } = (await req.json()) as { kbId?: string; message?: string };
    if (!kbId || !message?.trim()) {
      return NextResponse.json({ error: "kbId and message are required" }, { status: 400 });
    }

    await assertKbAccess(kbId, userId);
    await checkAndIncrementUsage(userId, "chat");

    const response = await chatWithKnowledgeBase(kbId, message);
    return NextResponse.json(response);
  } catch (err) {
    return apiError(err);
  }
}
