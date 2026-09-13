"use client";

import { useState, useRef, useEffect } from "react";
import type { KnowledgeBase, ChatMessage } from "@/lib/types";
import type { KbChatStreamState } from "@/lib/hooks/useKbChatStream";
import { cn } from "@/lib/cn";
import CopyButton from "@/components/CopyButton";
import MarkdownContent from "@/components/MarkdownContent";
import LoadingSpinner from "@/components/LoadingSpinner";
import MobileNavToggle from "@/components/MobileNavToggle";
import KbDeleteButton from "@/components/KbDeleteButton";

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  topic: string;
  kb: KnowledgeBase;
  messages: ChatMessage[];
  stream?: KbChatStreamState | null;
  onSend: (message: string) => void;
}

export default function ChatPanel({ topic, kb, messages, stream, onSend }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isBusy = Boolean(stream);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, stream?.content, stream?.status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isBusy) {
      onSend(input.trim());
      setInput("");
    }
  };

  const showStreamStatus = stream && !stream.content;

  return (
    <div className="chat-panel">
      <div className="chat-panel-body">
        <div className="chat-panel-header glass-header">
          <div className="app-inline-header-row">
            <MobileNavToggle />
            <div className="app-inline-header-text">
              <h2 className="chat-panel-title">{kb.topic}</h2>
              <p className="chat-panel-meta">
                {kb.videosIndexed} videos · {kb.chunksIndexed} chunks · ~{kb.totalMinutes} min
              </p>
            </div>
            <KbDeleteButton kbId={kb.kbId} topic={kb.topic} redirectOnDelete />
          </div>
        </div>

        <div className="chat-panel-messages">
        {messages.length === 0 && !stream && (
          <p className="chat-panel-empty">Start a conversation about this knowledge base.</p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("chat-message", msg.role === "user" ? "chat-message-user" : "chat-message-assistant")}
          >
            <div className="chat-message-bubble-wrap">
              {msg.role === "assistant" && (
                <CopyButton
                  variant="icon"
                  text={msg.content}
                  label="Copy response"
                  className="chat-message-copy"
                />
              )}
              <div className="chat-message-bubble">
                {msg.role === "assistant" ? (
                  <MarkdownContent content={msg.content} />
                ) : (
                  msg.content.split("\n").map((line, j) => (
                    <p key={j} className="mb-1.5 last:mb-0">
                      {line}
                    </p>
                  ))
                )}
              </div>
            </div>

            {msg.sources && msg.sources.length > 0 && (
              <div className="chat-message-sources">
                <span className="chat-message-sources-label">Sources</span>
                {msg.sources.map((src, j) => (
                  <a
                    key={j}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chat-message-source-link"
                  >
                    {src.title} @ {formatTimestamp(src.timestamp)}
                  </a>
                ))}
              </div>
            )}

            {msg.gaps && (
              <div className="chat-message-gaps">
                <span className="chat-message-gaps-label">Gaps</span>
                <p>{msg.gaps}</p>
              </div>
            )}
          </div>
        ))}

        {stream && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-message-bubble-wrap">
              {stream.content && (
                <CopyButton
                  variant="icon"
                  text={stream.content}
                  label="Copy response"
                  className="chat-message-copy"
                />
              )}
              <div className="chat-message-bubble">
                {showStreamStatus ? (
                  <div className="chat-stream-status">
                    <LoadingSpinner size="sm" />
                    <span className="chat-stream-status-text">{stream.status}</span>
                  </div>
                ) : (
                  <div className="chat-stream-markdown">
                    <MarkdownContent content={stream.content} />
                    {stream.isRevealing && (
                      <span className="chat-stream-cursor" aria-hidden="true" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="chat-panel-composer-wrap">
        <form className="chat-panel-composer" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about "${topic}"...`}
            disabled={isBusy}
            className="chat-panel-input"
          />
          <button type="submit" className="chat-panel-send" disabled={isBusy || !input.trim()}>
            Send
          </button>
        </form>
        <p className="chat-panel-disclaimer">
          The responses may be inaccurate. please report any issues and help us improve the application.
        </p>
      </div>
    </div>
  );
}
