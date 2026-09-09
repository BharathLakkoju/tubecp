"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { KnowledgeBase, ChatMessage } from "@/lib/types";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/cn";

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  topic: string;
  kb: KnowledgeBase;
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
}

export default function ChatPanel({ topic, kb, messages, loading, onSend }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col max-md:min-h-[calc(100dvh-5.5rem)]">
      <div className="mb-4 border-b border-border pb-4">
        <h2 className="font-mono text-base font-semibold text-text sm:text-lg">
          Chat with Knowledge Base
        </h2>
        <p className="mt-1 font-mono text-xs text-text-muted">
          {kb.videosIndexed} videos · {kb.chunksIndexed} chunks · ~{kb.totalMinutes} min
        </p>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {messages.map((msg, i) => {
          const content = (
            <>
              <div
                className={cn(
                  "px-4 py-4 font-mono text-[13px] leading-relaxed",
                  msg.role === "user"
                    ? "bg-accent text-white"
                    : "border-x border-border bg-surface text-text"
                )}
              >
                {msg.content.split("\n").map((line, j) => (
                  <p key={j} className="mb-1.5 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="border border-border border-t-0 bg-surface px-4 py-3">
                  <span className="mb-1.5 block font-mono text-[10px] tracking-wide text-text-muted uppercase">
                    Sources
                  </span>
                  {msg.sources.map((src, j) => (
                    <a
                      key={j}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-0.5 font-mono text-xs text-accent break-words"
                    >
                      {src.title} @ {formatTimestamp(src.timestamp)}
                    </a>
                  ))}
                </div>
              )}
              {msg.gaps && (
                <div className="border border-border border-t-0 bg-surface px-4 py-3">
                  <span className="mb-1 block font-mono text-[10px] tracking-wide text-warning uppercase">
                    Gaps
                  </span>
                  <p className="font-mono text-xs text-text-muted">{msg.gaps}</p>
                </div>
              )}
            </>
          );

          if (reduced) {
            return (
              <div key={i} className="max-w-full border-t border-border">
                {content}
              </div>
            );
          }

          return (
            <motion.div
              key={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="max-w-full border-t border-border"
            >
              {content}
            </motion.div>
          );
        })}
        {loading && (
          <div className="max-w-full border-t border-border">
            <div className="inline-flex gap-1 border border-border bg-surface px-4 py-4">
              <span className="size-1.5 animate-blink bg-text-muted" />
              <span className="size-1.5 animate-blink bg-text-muted [animation-delay:0.2s]" />
              <span className="size-1.5 animate-blink bg-text-muted [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="split-field sticky bottom-0 mt-4 bg-bg max-md:pb-[env(safe-area-inset-bottom)]" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about "${topic}"...`}
          disabled={loading}
          className="max-md:text-base"
        />
        <button type="submit" disabled={loading || !input.trim()}>
          send →
        </button>
      </form>
    </div>
  );
}
