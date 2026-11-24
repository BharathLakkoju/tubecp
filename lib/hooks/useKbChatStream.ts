"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { parseClientError, streamKbChatMessage } from "@/lib/client/chat";

export interface KbChatStreamState {
  status: string;
  content: string;
  sources?: ChatMessage["sources"];
  gaps?: string;
}

interface PendingDone {
  sources: ChatMessage["sources"];
  gaps?: string;
}

export function useKbChatStream() {
  const [stream, setStream] = useState<KbChatStreamState | null>(null);
  const bufferRef = useRef("");
  const pendingDoneRef = useRef<PendingDone | null>(null);
  const finalizeRef = useRef<((message: ChatMessage) => void) | null>(null);

  const finalizeStream = useCallback(() => {
    const pending = pendingDoneRef.current;
    const content = bufferRef.current;
    if (!pending || !finalizeRef.current) return;

    finalizeRef.current({
      role: "assistant",
      content,
      sources: pending.sources,
      gaps: pending.gaps,
    });

    bufferRef.current = "";
    pendingDoneRef.current = null;
    finalizeRef.current = null;
    setStream(null);
  }, []);

  const sendMessage = useCallback(
    async (
      kbId: string,
      message: string,
      onUserMessage: (msg: ChatMessage) => void,
      onAssistantMessage: (msg: ChatMessage) => void
    ) => {
      if (stream) return;

      onUserMessage({ role: "user", content: message });
      bufferRef.current = "";
      pendingDoneRef.current = null;
      finalizeRef.current = onAssistantMessage;

      setStream({
        status: "Exploring your question...",
        content: "",
      });

      try {
        await streamKbChatMessage(kbId, message, (event) => {
          if (event.type === "status") {
            setStream((prev) =>
              prev
                ? { ...prev, status: event.message }
                : { status: event.message, content: "" }
            );
          } else if (event.type === "token") {
            bufferRef.current += event.text;
            const content = bufferRef.current;
            setStream((prev) =>
              prev ? { ...prev, content } : { status: "", content }
            );
          } else if (event.type === "done") {
            pendingDoneRef.current = {
              sources: event.sources,
              gaps: event.gaps,
            };
            finalizeStream();
          }
        });
      } catch (err) {
        bufferRef.current = "";
        pendingDoneRef.current = null;
        finalizeRef.current = null;
        setStream(null);
        onAssistantMessage({ role: "assistant", content: parseClientError(err) });
      }
    },
    [stream, finalizeStream]
  );

  return { stream, sendMessage, isStreaming: Boolean(stream) };
}
