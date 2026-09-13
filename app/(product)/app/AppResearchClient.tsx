"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ResearchResult, ResearchLiveState } from "@/lib/types";
import type { ResearchStage, ResearchLiveUpdate } from "@/lib/client/workflows";
import { parseClientError } from "@/lib/client/chat";
import { useSubscription } from "@/lib/hooks/useSubscription";
import HeroSection from "@/components/HeroSection";
import SearchBox from "@/components/SearchBox";
import UsageIndicator from "@/components/UsageIndicator";
import MobileNavToggle from "@/components/MobileNavToggle";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";

const PhasePanel = dynamic(() => import("@/components/PhasePanel"), {
  loading: () => <div />,
});

const ResearchProgress = dynamic(() => import("@/components/ResearchProgress"));
const ResearchLiveView = dynamic(() => import("@/components/ResearchLiveView"));
const ResearchResults = dynamic(() => import("@/components/ResearchResults"));
const KbBuildProgress = dynamic(() => import("@/components/KbBuildProgress"));
const UpgradePrompt = dynamic(() => import("@/components/UpgradePrompt"));
const FreeTierTeaser = dynamic(() => import("@/components/FreeTierTeaser"));

function emptyLiveResearch(): ResearchLiveState {
  return {
    queries: [],
    allVideos: [],
    analyzedVideos: [],
    analyzedScores: {},
  };
}

export default function AppResearchClient({
  showUpgradedBanner = false,
}: {
  showUpgradedBanner?: boolean;
}) {
  const router = useRouter();
  const sub = useSubscription();
  const { refresh: refreshKnowledgeBases } = useKnowledgeBases();
  const [phase, setPhase] = useState<"search" | "results" | "building">("search");
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [researchStage, setResearchStage] = useState<ResearchStage>("expanding");
  const [liveResearch, setLiveResearch] = useState<ResearchLiveState>(emptyLiveResearch);
  const [error, setError] = useState("");
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);

  const mergeLiveResearch = (update: ResearchLiveUpdate) => {
    setLiveResearch((prev) => ({
      queries: update.queries ?? prev.queries,
      allVideos: update.allVideos ?? prev.allVideos,
      analyzedVideos: update.analyzedVideos ?? prev.analyzedVideos,
      analyzedScores: update.analyzedScores ?? prev.analyzedScores,
    }));
  };

  const handleSearch = async (searchTopic: string, options?: { resume?: boolean }) => {
    setLoading(true);
    setError("");
    setActiveTopic(searchTopic);
    setProgressMsg("");
    setProgressPct(0);
    setResearchStage("expanding");
    setLiveResearch(emptyLiveResearch());
    setResearch(null);
    if (!options?.resume) {
      setResumeSessionId(null);
    }
    setPhase("results");

    try {
      const { runResearch } = await import("@/lib/client/workflows");
      const { research: result, researchSessionId } = await runResearch(
        searchTopic,
        (msg, pct, stage, live) => {
          setProgressMsg(msg);
          if (pct !== undefined) setProgressPct(pct);
          if (stage) setResearchStage(stage);
          if (live) mergeLiveResearch(live);
        },
        options?.resume ? resumeSessionId ?? undefined : undefined
      );
      setResearch(result);
      setResumeSessionId(researchSessionId);
      setProgressMsg("");
    } catch (err) {
      setError(parseClientError(err));
      setPhase("search");
    } finally {
      setLoading(false);
    }
  };

  const handleBuildKB = async () => {
    if (!research || !sub.canBuildKb) return;

    setLoading(true);
    setError("");
    setPhase("building");
    setProgressMsg("Building knowledge base...");
    setProgressPct(0);

    try {
      const { buildKnowledgeBase } = await import("@/lib/client/workflows");
      const { kb, skippedVideos } = await buildKnowledgeBase(
        research.topic,
        research.rankedVideos,
        (msg, pct) => {
          setProgressMsg(msg);
          if (pct !== undefined) setProgressPct(pct);
        }
      );

      if (kb.status === "failed") {
        throw new Error(
          "No videos could be indexed. Every selected video was missing a transcript or failed to index."
        );
      }

      if (skippedVideos.length > 0) {
        sessionStorage.setItem(
          `kb-build-notice:${kb.kbId}`,
          JSON.stringify(skippedVideos)
        );
      }

      await refreshKnowledgeBases();
      router.refresh();
      router.push(`/app/kb/${kb.kbId}`);
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

        {showUpgradedBanner && (
          <div className="motion-fade-up mb-6 border border-border bg-surface px-4 py-3 text-center font-mono text-[13px] text-success">
            upgrade successful — you can now build knowledge bases and chat.
          </div>
        )}

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
                {error && resumeSessionId && activeTopic && (
                  <button
                    type="button"
                    className="btn-ghost mt-4"
                    onClick={() => handleSearch(activeTopic, { resume: true })}
                  >
                    resume research from checkpoint →
                  </button>
                )}
              </HeroSection>
              <UsageIndicator
                used={sub.researchUsedToday}
                limit={sub.researchLimit}
                label="researches today"
              />
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
                    {research.allVideos.length} scraped · {research.rankedVideos.length}{" "}
                    semantically relevant
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
                  <h3 className="mb-6 font-mono text-[13px] font-semibold text-text">
                    Final results
                  </h3>
                  <ResearchResults research={research} showCopyLinks={sub.plan === "free"} />
                  {sub.plan === "free" && <FreeTierTeaser research={research} />}
                </section>
              )}

              {phase === "building" && loading && (
                <KbBuildProgress detail={progressMsg} progress={progressPct} active={loading} />
              )}

              {phase === "results" &&
                !loading &&
                research &&
                research.rankedVideos.length > 0 &&
                (sub.canBuildKb ? (
                  <div className="mt-8 border-t border-border pt-6">
                    <p className="mb-4 font-mono text-[13px] text-text-muted">
                      Build a knowledge base from these {research.rankedVideos.length} videos?
                    </p>
                    <button
                      type="button"
                      className="btn-primary max-sm:w-full"
                      onClick={handleBuildKB}
                    >
                      build knowledge base →
                    </button>
                  </div>
                ) : (
                  <UpgradePrompt
                    title="Unlock knowledge base + chat"
                    description="Free tier includes ranked video lists. Upgrade to Pro to transcribe videos, build a knowledge base, and chat with cited sources."
                  />
                ))}

              {error && <p className="mt-4 font-mono text-[13px] text-accent">{error}</p>}
            </div>
          )}
        </PhasePanel>
      </div>
    </div>
  );
}
