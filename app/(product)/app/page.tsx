"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppSignedIn, AppSignedOut } from "@/components/AuthShell";
import type { ResearchResult, ResearchLiveState } from "@/lib/types";
import {
  runResearch,
  buildKnowledgeBase,
  emptyLiveResearch,
  type ResearchStage,
  type ResearchLiveUpdate,
} from "@/lib/client/workflows";
import { parseClientError } from "@/lib/client/chat";
import { useSubscription } from "@/lib/hooks/useSubscription";
import PhasePanel from "@/components/PhasePanel";
import HeroSection from "@/components/HeroSection";
import SearchBox from "@/components/SearchBox";
import ResearchResults from "@/components/ResearchResults";
import ResearchLiveView from "@/components/ResearchLiveView";
import ProgressBar from "@/components/ProgressBar";
import ResearchProgress from "@/components/ResearchProgress";
import UpgradePrompt from "@/components/UpgradePrompt";
import UsageIndicator from "@/components/UsageIndicator";
import MobileNavToggle from "@/components/MobileNavToggle";

export default function AppPage() {
  const router = useRouter();
  const sub = useSubscription();
  const [phase, setPhase] = useState<"search" | "results" | "building">("search");
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [researchStage, setResearchStage] = useState<ResearchStage>("expanding");
  const [liveResearch, setLiveResearch] = useState<ResearchLiveState>(emptyLiveResearch);
  const [error, setError] = useState("");
  const [upgraded, setUpgraded] = useState(false);

  const mergeLiveResearch = (update: ResearchLiveUpdate) => {
    setLiveResearch((prev) => ({
      queries: update.queries ?? prev.queries,
      allVideos: update.allVideos ?? prev.allVideos,
      analyzedVideos: update.analyzedVideos ?? prev.analyzedVideos,
      analyzedScores: update.analyzedScores ?? prev.analyzedScores,
    }));
  };

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
    setActiveTopic(searchTopic);
    setProgressMsg("");
    setProgressPct(0);
    setResearchStage("expanding");
    setLiveResearch(emptyLiveResearch());
    setResearch(null);
    setPhase("results");

    try {
      const result = await runResearch(searchTopic, (msg, pct, stage, live) => {
        setProgressMsg(msg);
        if (pct !== undefined) setProgressPct(pct);
        if (stage) setResearchStage(stage);
        if (live) mergeLiveResearch(live);
      });
      setResearch(result);
      setProgressMsg("");
    } catch (err) {
      setError(parseClientError(err));
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
      router.push(`/app/kb/${result.kbId}`);
    } catch (err) {
      setError(parseClientError(err));
      setPhase("results");
    } finally {
      setLoading(false);
      setProgressMsg("");
    }
  };

  const panelKey = phase === "search" ? "search" : "research";

  return (
    <div className="app-panel">
      <div className="app-panel-scroll">
        <div className="app-inline-header-row mb-4 md:hidden">
          <MobileNavToggle />
        </div>
        {upgraded && (
          <div className="motion-fade-up mb-6 border border-border bg-surface px-4 py-3 text-center font-mono text-[13px] text-success">
            upgrade successful — you can now build knowledge bases and chat.
          </div>
        )}

        <AppSignedOut>
          <HeroSection
            align="center"
            showWordmark={false}
            title="Sign in to start researching"
            subtitle="Search YouTube by topic, rank relevant videos, and build chattable knowledge bases with cited sources."
          >
            <Link href="/sign-in" className="btn-primary">sign in to continue →</Link>
          </HeroSection>
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

            {(phase === "results" || phase === "building") && (loading || research) && (
              <div>
                <div className="mb-6 border-b border-border pb-4">
                  <h2 className="font-mono text-base font-semibold break-words text-text">
                    research: {research?.topic ?? activeTopic}
                  </h2>
                  {research && !loading && phase === "results" && (
                    <p className="mt-1.5 font-mono text-xs text-text-muted">
                      {research.allVideos.length} scraped · {research.rankedVideos.length} semantically relevant
                    </p>
                  )}
                </div>

                {loading && phase === "results" && (
                  <ResearchProgress
                    topic={activeTopic}
                    stage={researchStage}
                    detail={progressMsg}
                    progress={progressPct}
                  />
                )}

                <ResearchLiveView live={liveResearch} />

                {research && (phase === "building" || !loading) && (
                  <section className="mt-8 border-t border-border pt-8">
                    <h3 className="mb-6 font-mono text-[13px] font-semibold text-text">Final results</h3>
                    <ResearchResults research={research} showCopyLinks={sub.plan === "free"} />
                  </section>
                )}

                {phase === "building" && loading && (
                  <ProgressBar message={progressMsg} progress={progressPct} />
                )}

                {phase === "results" && !loading && research && research.rankedVideos.length > 0 && (
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

                {error && <p className="mt-4 font-mono text-[13px] text-accent">{error}</p>}
              </div>
            )}
          </PhasePanel>
        </AppSignedIn>
      </div>
    </div>
  );
}
