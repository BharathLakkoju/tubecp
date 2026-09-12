import type { ChatMessage, ChatSource } from "@/lib/types";

export type ChatStreamEvent =
  | { type: "status"; message: string }
  | { type: "token"; text: string }
  | { type: "done"; sources: ChatSource[]; gaps?: string }
  | { type: "error"; message: string };

export function parseClientError(err: unknown): string {
  const msg = String(err);
  if (msg.includes("FEATURE_GATE") || msg.includes("Pro plan")) {
    return "Knowledge base and chat require a Pro plan.";
  }
  if (msg.includes("USAGE_LIMIT")) {
    return msg.replace("Error: ", "");
  }
  if (msg.includes("Sign in")) {
    return "Please sign in to continue.";
  }
  return msg.replace("Error: ", "");
}

export async function loadKbChatMessages(kbId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/knowledge-base/${kbId}/messages`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load chat history");
  return (data.messages ?? []) as ChatMessage[];
}

export async function saveKbChatMessages(kbId: string, messages: ChatMessage[]): Promise<void> {
  const res = await fetch(`/api/knowledge-base/${kbId}/messages`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to save chat history");
  }
}

export async function streamKbChatMessage(
  kbId: string,
  message: string,
  onEvent: (event: ChatStreamEvent) => void
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kbId, message }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Chat failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ChatStreamEvent;
      onEvent(event);
      if (event.type === "error") {
        throw new Error(event.message);
      }
    }
  }
}
