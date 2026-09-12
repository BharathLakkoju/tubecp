import { NextRequest, NextResponse } from "next/server";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { ensureKbWelcomeMessage, getKbChatMessages, saveKbChatMessages } from "@/lib/services/kb-chat";
import type { ChatMessage } from "@/lib/types";
import { z } from "zod";

const saveSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      sources: z.array(z.unknown()).optional(),
      gaps: z.string().optional(),
    })
  ),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    await assertKbAccess(kbId, userId);
    const messages = await ensureKbWelcomeMessage(kbId);
    return NextResponse.json({ messages });
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { kbId } = await params;
    await assertKbAccess(kbId, userId);

    const body = await req.json().catch(() => null);
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid messages payload" }, { status: 400 });
    }

    await saveKbChatMessages(kbId, parsed.data.messages as ChatMessage[]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
