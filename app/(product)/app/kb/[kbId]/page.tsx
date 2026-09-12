"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ChatMessage, KnowledgeBase } from "@/lib/types";
import { loadKbChatMessages, parseClientError } from "@/lib/client/chat";
import { useKbChatStream } from "@/lib/hooks/useKbChatStream";
import { useSubscription } from "@/lib/hooks/useSubscription";
import ChatPanel from "@/components/ChatPanel";
import LoadingSpinner from "@/components/LoadingSpinner";
import UpgradePrompt from "@/components/UpgradePrompt";

export default function KnowledgeBaseChatPage() {
  const params = useParams<{ kbId: string }>();
  const kbId = params.kbId;
  const sub = useSubscription();
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { stream, sendMessage, isStreaming } = useKbChatStream();

  useEffect(() => {
    if (!kbId || !sub.canChat) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [kbRes, msgRes] = await Promise.all([
          fetch(`/api/knowledge-base/${kbId}`),
          loadKbChatMessages(kbId),
        ]);

        const kbData = await kbRes.json();
        if (!kbRes.ok) throw new Error(kbData.error ?? "Failed to load knowledge base");

        if (!cancelled) {
          setKb(kbData);
          setMessages(msgRes);
        }
      } catch (err) {
        if (!cancelled) setError(parseClientError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [kbId, sub.canChat]);

  const handleChat = useCallback(
    (message: string) => {
      if (!kb || isStreaming) return;

      sendMessage(
        kb.kbId,
        message,
        (userMsg) => setMessages((prev) => [...prev, userMsg]),
        (assistantMsg) => setMessages((prev) => [...prev, assistantMsg])
      );
    },
    [kb, isStreaming, sendMessage]
  );

  if (!sub.canChat) {
    return (
      <div className="app-panel">
        <div className="app-panel-scroll">
          <UpgradePrompt
            title="Chat requires Pro"
            description="Upgrade to chat with your knowledge bases using cited transcript sources."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-panel">
        <LoadingSpinner label="Loading chat..." />
      </div>
    );
  }

  if (error || !kb) {
    return (
      <div className="app-panel">
        <div className="app-panel-scroll">
          <p className="font-mono text-[13px] text-accent">{error || "Knowledge base not found"}</p>
          <Link href="/app" className="btn-ghost mt-4 inline-flex">
            ← back to research
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-panel app-panel-chat">
      <ChatPanel
        topic={kb.topic}
        kb={kb}
        messages={messages}
        stream={stream}
        onSend={handleChat}
      />
    </div>
  );
}
