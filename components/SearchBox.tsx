"use client";

import { useState } from "react";

interface Props {
  onSearch: (topic: string) => void;
  loading: boolean;
}

const EXAMPLES = [
  "How developers monetize AI SaaS products",
  "Best practices for React Server Components",
  "Building a startup with no funding",
];

export default function SearchBox({ onSearch, loading }: Props) {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !loading) onSearch(topic.trim());
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="split-field">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to research on YouTube?"
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading || !topic.trim()}>
            {loading ? "searching..." : "research →"}
          </button>
        </div>
      </form>
      <div className="mt-4 flex flex-col">
        <span className="mb-2 font-mono text-xs text-text-muted">try:</span>
        {EXAMPLES.map((ex, i) => (
          <button
            key={ex}
            type="button"
            className="w-full border-0 border-t border-border bg-transparent py-3 text-left font-mono text-[13px] leading-normal text-text-muted transition-colors duration-150 ease-out hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setTopic(ex);
              onSearch(ex);
            }}
            disabled={loading}
          >
            {String(i + 1).padStart(2, "0")} {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
