"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, KnowledgeBase } from "@/lib/types";
import type { SkippedKbVideo } from "@/lib/client/workflows";
import { useKbChatStream } from "@/lib/hooks/useKbChatStream";
import ChatPanel from "@/components/ChatPanel";

export default function KbChatClient({
  kb,
  initialMessages,
}: {
  kb: KnowledgeBase;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [buildNotice, setBuildNotice] = useState<string | null>(null);
  const { stream, sendMessage, isStreaming } = useKbChatStream();

  useEffect(() => {
    const raw = sessionStorage.getItem(`kb-build-notice:${kb.kbId}`);
    if (!raw) return;

    sessionStorage.removeItem(`kb-build-notice:${kb.kbId}`);

    try {
      const skipped = JSON.parse(raw) as SkippedKbVideo[];
      if (!skipped.length) return;

      const lines = skipped.map((item) => item.reason).join(" ");
      setBuildNotice(
        `${skipped.length} video${skipped.length === 1 ? "" : "s"} could not be indexed and were skipped. ${lines}`,
      );
    } catch {
      // ignore malformed notice payload
    }
  }, [kb.kbId]);

  const handleChat = useCallback(
    (message: string) => {
      if (isStreaming) return;

      sendMessage(
        kb.kbId,
        message,
        (userMsg) => setMessages((prev) => [...prev, userMsg]),
        (assistantMsg) => setMessages((prev) => [...prev, assistantMsg])
      );
    },
    [isStreaming, kb.kbId, sendMessage]
  );

  return (
    <ChatPanel
      topic={kb.topic}
      kb={kb}
      messages={messages}
      stream={stream}
      notice={buildNotice}
      onSend={handleChat}
    />
  );
}
