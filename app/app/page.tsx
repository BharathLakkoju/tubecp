"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppSignedIn, AppSignedOut } from "@/components/AuthShell";
import type { AppPhase, ResearchResult, KnowledgeBase, ChatMessage } from "@/lib/types";
import { runResearch, buildKnowledgeBase } from "@/lib/client/workflows";
import { useSubscription } from "@/lib/hooks/useSubscription";
import PhasePanel from "@/components/PhasePanel";
import SiteNav from "@/components/SiteNav";
import PageShell from "@/components/PageShell";
import HeroSection from "@/components/HeroSection";
import SearchBox from "@/components/SearchBox";
import VideoList from "@/components/VideoList";
import ChatPanel from "@/components/ChatPanel";
import ProgressBar from "@/components/ProgressBar";
import UpgradePrompt from "@/components/UpgradePrompt";
import UsageIndicator from "@/components/UsageIndicator";

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

export default function AppPage() {
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
      window.history.replaceState({}, "", "/app");
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

  const panelKey =
    phase === "search" ? "search" : phase === "chat" ? "chat" : "research";

  return (
    <PageShell showThemeSwitcher={false}>
      <div className="flex min-h-dvh flex-col">
        <SiteNav
          variant="app"
          onReset={handleReset}
          showNewResearch={phase !== "search"}
        />

        <main className="page-container flex-1">
          {upgraded && (
            <div className="motion-fade-up mb-6 border border-border bg-surface px-4 py-3 text-center font-mono text-[13px] text-success">
              upgrade successful — you can now build knowledge bases and chat.
            </div>
          )}

          <AppSignedOut>
            <div className="motion-fade-up">
            <HeroSection
              align="center"
              showWordmark={false}
              title="Sign in to start researching"
              subtitle="Search YouTube by topic, rank relevant videos, and build chattable knowledge bases with cited sources."
            >
              <Link href="/sign-in" className="btn-primary">sign in to continue →</Link>
            </HeroSection>
            </div>
          </AppSignedOut>

          <AppSignedIn>
            <PhasePanel phase={panelKey}>
            {phase === "search" && (
              <>
                <HeroSection
                  showWordmark={false}
                  title="What do you want to research?"
                  subtitle={
                    sub.canBuildKb
                      ? `Free: ranked video lists (${sub.researchLimit}/day). Pro: ${sub.kbBuildsLimit - sub.kbBuildsUsed} KB builds and ${sub.chatLimit - sub.chatUsed} chats left this month.`
                      : `Free: ranked video lists (${sub.researchLimit}/day). Upgrade to build knowledge bases and chat.`
                  }
                >
                  <SearchBox onSearch={handleSearch} loading={loading} />
                  {error && (
                    <p className="mt-4 font-mono text-[13px] text-accent">{error}</p>
                  )}
                </HeroSection>
                {!sub.loading && (
                  <UsageIndicator
                    used={sub.researchUsedToday}
                    limit={sub.researchLimit}
                    label="researches today"
                  />
                )}
              </>
            )}

            {(phase === "results" || phase === "building") && research && (
              <div>
                <div className="mb-6 border-b border-border pb-4">
                  <h2 className="font-mono text-base font-semibold break-words text-text">
                    research: {research.topic}
                  </h2>
                  <p className="mt-1.5 font-mono text-xs text-text-muted">
                    {research.videosSearched} videos searched · {research.rankedVideos.length} ranked relevant
                  </p>
                </div>

                {loading && <ProgressBar message={progressMsg} progress={progressPct} />}

                <VideoList videos={research.rankedVideos} />

                {phase === "results" && !loading && research.rankedVideos.length > 0 && (
                  sub.canBuildKb ? (
                    <div className="mt-8 border-t border-border pt-6">
                      <p className="mb-4 font-mono text-[13px] text-text-muted">
                        Build a knowledge base from these {research.rankedVideos.length} videos?
                      </p>
                      <button className="btn-primary max-sm:w-full" onClick={handleBuildKB}>
                        build knowledge base →
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
                  <p className="border-t border-border py-8 text-center font-mono text-[13px] text-text-muted">
                    No relevant videos found. Try a different topic or broader search terms.
                  </p>
                )}

                {error && <p className="mt-4 font-mono text-[13px] text-accent">{error}</p>}
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
            </PhasePanel>
          </AppSignedIn>
        </main>
      </div>
    </PageShell>
  );
}
