"use client";

import { useState } from "react";
import styles from "./SearchBox.module.css";

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
    <div className={styles.searchBox}>
      <form onSubmit={handleSubmit}>
        <div className={styles.searchInputWrap}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to research on YouTube?"
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading || !topic.trim()}>
            {loading ? "Searching..." : "Research"}
          </button>
        </div>
      </form>
      <div className={styles.examples}>
        <span className={styles.examplesLabel}>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className={styles.exampleChip}
            onClick={() => {
              setTopic(ex);
              onSearch(ex);
            }}
            disabled={loading}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
