"use client";

import { useState, useRef, useEffect } from "react";
import type { KnowledgeBase, ChatMessage } from "@/lib/types";
import styles from "./ChatPanel.module.css";

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
    <div className={styles.chatPanel}>
      <div className={styles.chatHeader}>
        <h2>Chat with Knowledge Base</h2>
        <p className={styles.chatMeta}>
          {kb.videosIndexed} videos · {kb.chunksIndexed} chunks · ~{kb.totalMinutes} min
        </p>
      </div>

      <div className={styles.chatMessages}>
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[`message${msg.role}`]}`}>
            <div className={styles.messageContent}>
              {msg.content.split("\n").map((line, j) => (
                <p key={j}>{line}</p>
              ))}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className={styles.sources}>
                <span className={styles.sourcesLabel}>Sources</span>
                {msg.sources.map((src, j) => (
                  <a
                    key={j}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    {src.title} @ {formatTimestamp(src.timestamp)}
                  </a>
                ))}
              </div>
            )}
            {msg.gaps && (
              <div className={styles.gaps}>
                <span className={styles.gapsLabel}>Gaps</span>
                <p>{msg.gaps}</p>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.messageassistant}`}>
            <div className={styles.typingIndicator}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.chatInput} onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about "${topic}"...`}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
