import { NextRequest } from "next/server";
import { streamKnowledgeBaseChat } from "@/lib/services/chat";
import { appendKbChatMessages } from "@/lib/services/kb-chat";
import { requireUserId, apiError } from "@/lib/auth";
import { assertKbAccess } from "@/lib/kb-access";
import { checkAndIncrementUsage } from "@/lib/billing/subscription";
import { rateLimitApi } from "@/lib/ratelimit";
import type { ChatMessage, ChatSource } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await rateLimitApi(userId, "chat", 30);

    const { kbId, message } = (await req.json()) as { kbId?: string; message?: string };
    if (!kbId || !message?.trim()) {
      return new Response(JSON.stringify({ error: "kbId and message are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await assertKbAccess(kbId, userId);
    await checkAndIncrementUsage(userId, "chat");

    const trimmed = message.trim();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        let answer = "";
        let sources: ChatSource[] = [];
        let gaps: string | undefined;

        try {
          for await (const event of streamKnowledgeBaseChat(kbId, trimmed)) {
            if (event.type === "token") {
              answer += event.text;
            } else if (event.type === "done") {
              sources = event.sources;
              gaps = event.gaps;
            } else if (event.type === "error") {
              send(event);
              return;
            }

            send(event);
          }

          const userMsg: ChatMessage = { role: "user", content: trimmed };
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: answer,
            sources,
            gaps,
          };
          await appendKbChatMessages(kbId, userMsg, assistantMsg);
        } catch (err) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Chat failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
