"use client";

import { useState, useEffect } from "react";
import { AppSignedIn, AppSignedOut, AppSignInButton } from "@/components/AuthShell";
import type { AppPhase, ResearchResult, KnowledgeBase, ChatMessage } from "@/lib/types";
import { runResearch, buildKnowledgeBase } from "@/lib/client/workflows";
import { useSubscription } from "@/lib/hooks/useSubscription";
import Header from "@/components/Header";
import SearchBox from "@/components/SearchBox";
import VideoList from "@/components/VideoList";
import ChatPanel from "@/components/ChatPanel";
import ProgressBar from "@/components/ProgressBar";
import UpgradePrompt from "@/components/UpgradePrompt";
import styles from "./page.module.css";

function parseError(err: unknown): string {
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

export default function HomePage() {
  const sub = useSubscription();
  const [phase, setPhase] = useState<AppPhase>("search");
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [error, setError] = useState("");
  const [upgraded, setUpgraded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      setUpgraded(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const handleSearch = async (searchTopic: string) => {
    setLoading(true);
    setError("");
    setProgressMsg("Starting research...");
    setProgressPct(0);
    setPhase("results");

    try {
      const result = await runResearch(searchTopic, 15, (msg, pct) => {
        setProgressMsg(msg);
        if (pct !== undefined) setProgressPct(pct);
      });
      setResearch(result);
      setProgressMsg("");
    } catch (err) {
      setError(parseError(err));
      setPhase("search");
    } finally {
      setLoading(false);
    }
  };

  const handleBuildKB = async () => {
    if (!research) return;
    if (!sub.canBuildKb) return;

    setLoading(true);
    setError("");
    setPhase("building");
    setProgressMsg("Building knowledge base...");
    setProgressPct(0);

    try {
      const result = await buildKnowledgeBase(
        research.topic,
        research.rankedVideos,
        (msg, pct) => {
          setProgressMsg(msg);
          if (pct !== undefined) setProgressPct(pct);
        }
      );

      setKb(result);
      setPhase("chat");
      setMessages([
        {
          role: "assistant",
          content: `Knowledge base ready! I've indexed ${result.videosIndexed} videos (${result.chunksIndexed} chunks, ~${result.totalMinutes} min) on "${result.topic}".\n\nAsk me anything — answers are grounded in video transcripts with sources.`,
        },
      ]);
    } catch (err) {
      setError(parseError(err));
      setPhase("results");
    } finally {
      setLoading(false);
      setProgressMsg("");
    }
  };

  const handleChat = async (message: string) => {
    if (!kb) return;

    const userMsg: ChatMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kbId: kb.kbId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          gaps: data.gaps,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: parseError(err) }]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhase("search");
    setResearch(null);
    setKb(null);
    setMessages([]);
    setError("");
  };

  return (
    <div className={styles.app}>
      <Header onReset={handleReset} showNewResearch={phase !== "search"} />

      <main className={styles.main}>
        {upgraded && (
          <div className={styles.successBanner}>
            Upgrade successful! You can now build knowledge bases and chat.
          </div>
        )}

        <AppSignedOut>
          <div className={styles.hero}>
            <h1>Turn YouTube into a knowledge base you can talk to</h1>
            <p className={styles.heroSub}>
              Search YouTube by topic, rank the most relevant videos, then chat with
              a knowledge base built from their transcripts — with cited sources.
            </p>
            <AppSignInButton mode="modal">
              <button className={styles.btnPrimary}>Sign in to start researching</button>
            </AppSignInButton>
          </div>
        </AppSignedOut>

        <AppSignedIn>
          {phase === "search" && (
            <div className={styles.hero}>
              <h1>What do you want to research?</h1>
              <p className={styles.heroSub}>
                Free: ranked video lists ({sub.researchLimit}/day).
                {sub.canBuildKb
                  ? ` Pro: ${sub.kbBuildsLimit - sub.kbBuildsUsed} KB builds and ${sub.chatLimit - sub.chatUsed} chats left this month.`
                  : " Upgrade to build knowledge bases and chat."}
              </p>
              <SearchBox onSearch={handleSearch} loading={loading} />
              {error && <p className={styles.error}>{error}</p>}
            </div>
          )}

          {(phase === "results" || phase === "building") && research && (
            <div className={styles.resultsSection}>
              <div className={styles.resultsHeader}>
                <h2>Research: {research.topic}</h2>
                <p className={styles.meta}>
                  {research.videosSearched} videos searched → {research.rankedVideos.length} ranked relevant
                </p>
              </div>

              {loading && <ProgressBar message={progressMsg} progress={progressPct} />}

              <VideoList videos={research.rankedVideos} />

              {phase === "results" && !loading && research.rankedVideos.length > 0 && (
                sub.canBuildKb ? (
                  <div className={styles.buildCta}>
                    <p>Build a knowledge base from these {research.rankedVideos.length} videos?</p>
                    <button className={styles.btnPrimary} onClick={handleBuildKB}>
                      Build Knowledge Base & Chat
                    </button>
                  </div>
                ) : (
                  <UpgradePrompt
                    title="Unlock knowledge base + chat"
                    description="Free tier includes ranked video lists. Upgrade to Pro to transcribe videos, build a knowledge base, and chat with cited sources."
                  />
                )
              )}

              {research.rankedVideos.length === 0 && !loading && (
                <p className={styles.empty}>
                  No relevant videos found. Try a different topic or broader search terms.
                </p>
              )}

              {error && <p className={styles.error}>{error}</p>}
            </div>
          )}

          {phase === "chat" && kb && sub.canChat && (
            <ChatPanel
              topic={kb.topic}
              kb={kb}
              messages={messages}
              loading={loading}
              onSend={handleChat}
            />
          )}
        </AppSignedIn>
      </main>
    </div>
  );
}
