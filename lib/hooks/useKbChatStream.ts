"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { nextRevealIndex } from "@/lib/markdown";
import { parseClientError, streamKbChatMessage } from "@/lib/client/chat";

const REVEAL_INTERVAL_MS = 110;

export interface KbChatStreamState {
  status: string;
  content: string;
  sources?: ChatMessage["sources"];
  gaps?: string;
  isRevealing: boolean;
}

interface PendingDone {
  sources: ChatMessage["sources"];
  gaps?: string;
}

export function useKbChatStream() {
  const [stream, setStream] = useState<KbChatStreamState | null>(null);
  const [revealActive, setRevealActive] = useState(false);
  const bufferRef = useRef("");
  const revealIndexRef = useRef(0);
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
    revealIndexRef.current = 0;
    pendingDoneRef.current = null;
    finalizeRef.current = null;
    setRevealActive(false);
    setStream(null);
  }, []);

  useEffect(() => {
    if (!revealActive) return;

    const tick = () => {
      const buffer = bufferRef.current;
      const revealed = revealIndexRef.current;

      if (revealed < buffer.length) {
        const next = nextRevealIndex(buffer, revealed);
        revealIndexRef.current = next;
        setStream((prev) =>
          prev
            ? {
                ...prev,
                content: buffer.slice(0, next),
                isRevealing: true,
              }
            : null
        );
        return;
      }

      if (pendingDoneRef.current) {
        finalizeStream();
        return;
      }

      setStream((prev) => (prev ? { ...prev, isRevealing: false } : null));
    };

    const id = window.setInterval(tick, REVEAL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [revealActive, finalizeStream]);

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
      revealIndexRef.current = 0;
      pendingDoneRef.current = null;
      finalizeRef.current = onAssistantMessage;
      setRevealActive(true);

      setStream({
        status: "Exploring your question...",
        content: "",
        isRevealing: true,
      });

      try {
        await streamKbChatMessage(kbId, message, (event) => {
          if (event.type === "status") {
            setStream((prev) =>
              prev
                ? { ...prev, status: event.message, isRevealing: true }
                : { status: event.message, content: "", isRevealing: true }
            );
          } else if (event.type === "token") {
            bufferRef.current += event.text;
            setStream((prev) =>
              prev
                ? { ...prev, isRevealing: true }
                : { status: "", content: "", isRevealing: true }
            );
          } else if (event.type === "done") {
            pendingDoneRef.current = {
              sources: event.sources,
              gaps: event.gaps,
            };

            if (revealIndexRef.current >= bufferRef.current.length) {
              finalizeStream();
            }
          }
        });
      } catch (err) {
        bufferRef.current = "";
        revealIndexRef.current = 0;
        pendingDoneRef.current = null;
        finalizeRef.current = null;
        setRevealActive(false);
        setStream(null);
        onAssistantMessage({ role: "assistant", content: parseClientError(err) });
      }
    },
    [stream, finalizeStream]
  );

  return { stream, sendMessage, isStreaming: Boolean(stream) };
}
