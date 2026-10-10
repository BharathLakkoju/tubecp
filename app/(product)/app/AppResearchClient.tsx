"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WarningCircle } from "@phosphor-icons/react";
import type { ResearchResult, ResearchLiveState } from "@/lib/types";
import type { ResearchStage, ResearchLiveUpdate } from "@/lib/client/workflows";
import { parseClientError } from "@/lib/client/chat";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";
import { useResearches } from "@/lib/hooks/useResearches";
import { getPlan } from "@/lib/plans";
import AppPage from "@/components/tubecp/AppPage";
import ActionDock from "@/components/tubecp/ActionDock";
import JobStatus from "@/components/tubecp/JobStatus";
import KbTile from "@/components/tubecp/KbTile";
import type { PipelineStep } from "@/components/tubecp/PipelineRail";
import SearchBar from "@/components/tubecp/SearchBar";
import VideoResultsSkeletonList from "@/components/tubecp/VideoResultsSkeletonList";
import Reveal from "@/components/motion/Reveal";
import Stagger, { StaggerItem } from "@/components/motion/Stagger";
import ResearchLiveView from "@/components/ResearchLiveView";
import ResearchResults from "@/components/ResearchResults";
import KbBuildProgress from "@/components/KbBuildProgress";
import UpgradePrompt from "@/components/UpgradePrompt";
import FreeTierTeaser from "@/components/FreeTierTeaser";
import UpgradeSuccessBanner from "@/components/UpgradeSuccessBanner";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import RecentResearchesSection from "@/components/RecentResearchesSection";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KnowledgeBaseBuildStatus } from "@/lib/kb-build-status";
import { formatKbBuildEta, formatKbBuildRemaining } from "@/lib/kb-build-estimate";

/** Videos preselected for a knowledge base build. */
const TOP_COUNT = 20;
/** No progress update for this long = stalled (design system 6.7). */
const STALL_AFTER_MS = 45_000;

const SUGGESTIONS = [
  "How developers monetize AI SaaS products",
  "Best practices for React Server Components",
  "Building a startup with no funding",
];

const RESEARCH_STAGES: { id: ResearchStage; label: string }[] = [
  { id: "expanding", label: "Expand queries" },
  { id: "searching", label: "Search YouTube" },
  { id: "analyzing", label: "Analyze videos" },
  { id: "ranking", label: "Rank" },
];

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
  const { knowledgeBases, refresh: refreshKnowledgeBases } = useKnowledgeBases();
  const { refresh: refreshResearches } = useResearches();
  const [phase, setPhase] = useState<"search" | "results" | "building">("search");
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [researchStage, setResearchStage] = useState<ResearchStage>("expanding");
  const [liveResearch, setLiveResearch] = useState<ResearchLiveState>(emptyLiveResearch);
  const [error, setError] = useState("");
  const [buildError, setBuildError] = useState("");
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startedAt, setStartedAt] = useState<number | undefined>();
  const [stalled, setStalled] = useState(false);

  const liveResearchEmpty =
    liveResearch.queries.length === 0 &&
    liveResearch.allVideos.length === 0 &&
    liveResearch.analyzedVideos.length === 0;
  const [buildVideoCount, setBuildVideoCount] = useState(0);
  const [activeBuildKbId, setActiveBuildKbId] = useState<string | null>(null);
  const [liveBuildStatus, setLiveBuildStatus] = useState<KnowledgeBaseBuildStatus | null>(null);
  const [useSpeechToText, setUseSpeechToText] = useState(false);
  const lastProgressAt = useRef(Date.now());

  const ranked = useMemo(
    () => [...(research?.rankedVideos ?? [])].sort((a, b) => b.relevanceScore - a.relevanceScore),
    [research]
  );

  useEffect(() => {
    if (!activeBuildKbId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/knowledge-base/${activeBuildKbId}/build-status`);
        const data = await res.json();
        if (res.ok) setLiveBuildStatus(data as KnowledgeBaseBuildStatus);
      } catch {
        // ignore polling errors during build
      }
    };

    void poll();
    const interval = window.setInterval(poll, 4000);
    return () => window.clearInterval(interval);
  }, [activeBuildKbId]);

  const touchProgress = () => {
    lastProgressAt.current = Date.now();
    setStalled(false);
  };

  // Stalled detection: a running job with no progress update for 45s+.
  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setStalled(Date.now() - lastProgressAt.current >= STALL_AFTER_MS);
    }, 5000);
    return () => window.clearInterval(id);
  }, [loading]);

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
    setBuildError("");
    setActiveTopic(searchTopic);
    setProgressMsg("");
    setProgressPct(0);
    setResearchStage("expanding");
    setLiveResearch(emptyLiveResearch());
    setResearch(null);
    setSelectedIds(new Set());
    setStartedAt(Date.now());
    touchProgress();
    if (!options?.resume) {
      setResumeSessionId(null);
    }
    setPhase("results");

    let progressed = false;

    try {
      const { runResearch } = await import("@/lib/client/workflows");
      const { research: result, researchSessionId } = await runResearch(
        searchTopic,
        (msg, pct, stage, live) => {
          progressed = true;
          touchProgress();
          setProgressMsg(msg);
          if (pct !== undefined) setProgressPct(pct);
          if (stage) setResearchStage(stage);
          if (live) mergeLiveResearch(live);
        },
        options?.resume ? resumeSessionId ?? undefined : undefined
      );
      setResearch(result);
      setResumeSessionId(researchSessionId);
      void refreshResearches({ silent: true });
      setProgressMsg("");
      const top = [...result.rankedVideos]
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, TOP_COUNT)
        .map((video) => video.videoId);
      setSelectedIds(new Set(top));
    } catch (err) {
      setError(parseClientError(err));
      if (!progressed) {
        setPhase("search");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuildKB = async () => {
    if (!research || !sub.canBuildKb || kbBuildLimitReached) return;
    const chosen = ranked.filter((video) => selectedIds.has(video.videoId));
    if (chosen.length === 0) return;

    setLoading(true);
    setError("");
    setBuildError("");
    setPhase("building");
    setProgressMsg("");
    setProgressPct(0);
    setBuildVideoCount(chosen.length);
    setStartedAt(Date.now());
    touchProgress();

    try {
      const { buildKnowledgeBase } = await import("@/lib/client/workflows");
      const { kb, skippedVideos } = await buildKnowledgeBase(
        research.topic,
        chosen,
        (msg, pct) => {
          touchProgress();
          setProgressMsg(msg);
          if (pct !== undefined) setProgressPct(pct);
        },
        {
          onKnowledgeBaseCreated: (kbId) => {
            setActiveBuildKbId(kbId);
            void refreshKnowledgeBases({ silent: true });
          },
          useSpeechToText,
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
      setBuildError(parseClientError(err));
      setPhase("results");
    } finally {
      setLoading(false);
      setProgressMsg("");
      setActiveBuildKbId(null);
      setLiveBuildStatus(null);
    }
  };

  const toggleVideo = (videoId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(videoId);
      else next.delete(videoId);
      return next;
    });
  };

  const selectTop = () => setSelectedIds(new Set(ranked.slice(0, TOP_COUNT).map((v) => v.videoId)));
  const selectAll = () => setSelectedIds(new Set(ranked.map((v) => v.videoId)));
  const clearSelection = () => setSelectedIds(new Set());

  const researchSteps: PipelineStep[] = useMemo(() => {
    const activeIndex = RESEARCH_STAGES.findIndex((stage) => stage.id === researchStage);
    return RESEARCH_STAGES.map((stage, index) => {
      let count: string | undefined;
      if (stage.id === "searching" && liveResearch.allVideos.length > 0) {
        count = `${liveResearch.allVideos.length} found`;
      }
      if (stage.id === "analyzing" && liveResearch.analyzedVideos.length > 0) {
        count = `${liveResearch.analyzedVideos.length} done`;
      }
      return {
        id: stage.id,
        label: stage.label,
        count,
        state: index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
      } satisfies PipelineStep;
    });
  }, [researchStage, liveResearch.allVideos.length, liveResearch.analyzedVideos.length]);

  const researchFailed = phase === "results" && !loading && !research && !!error;
  const researchDone = phase === "results" && !loading && !!research;

  const quotaText = sub.loading
    ? undefined
    : `${sub.researchUsedToday} / ${sub.researchLimit} researches today`;
  const limitReached =
    !sub.loading && sub.researchLimit > 0 && sub.researchUsedToday >= sub.researchLimit;
  const kbBuildLimitReached =
    !sub.loading &&
    sub.canBuildKb &&
    sub.kbBuildsLimit > 0 &&
    sub.kbBuildsUsed >= sub.kbBuildsLimit;
  const kbBuildQuotaMessage = kbBuildLimitReached
    ? `Monthly KB build limit reached (${sub.kbBuildsUsed} / ${sub.kbBuildsLimit}). Resets on your billing date or upgrade for more.`
    : undefined;
  const proName = getPlan("pro").name;

  const recentKbs = knowledgeBases.slice(0, 3);

  return (
    <AppPage>
      {showUpgradedBanner && <UpgradeSuccessBanner />}

      {phase === "search" && (
        <div className="mx-auto flex max-w-(--reading-max) flex-col gap-10 pt-6 sm:pt-16">
          <Reveal tone="app" immediate className="flex flex-col gap-3">
            <h1 className="text-headline text-foreground">What do you want to research?</h1>
            <p className="text-body text-foreground-secondary">
              We search YouTube, rank videos by how well they cover your topic
              {sub.canBuildKb ? ", then turn the best into a knowledge base you can chat with." : "."}
            </p>
          </Reveal>

          <Reveal tone="app" immediate delay={0.05} className="flex flex-col gap-4">
            <SearchBar
              onSearch={(topic) => void handleSearch(topic)}
              loading={loading}
              quotaText={quotaText}
              disabledReason={
                limitReached
                  ? `Daily research limit reached (${sub.researchLimit}). It resets tomorrow.`
                  : undefined
              }
              suggestions={SUGGESTIONS}
            />

            {error && (
              <Alert variant="destructive">
                <WarningCircle weight="fill" aria-hidden />
                <AlertTitle>Research didn&apos;t finish</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                {resumeSessionId && activeTopic && (
                  <AlertAction>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSearch(activeTopic, { resume: true })}
                    >
                      Resume from checkpoint
                    </Button>
                  </AlertAction>
                )}
              </Alert>
            )}
          </Reveal>

          {sub.loading ? null : limitReached && !sub.canBuildKb ? (
            <UpgradePrompt
              title="Need more researches?"
              description={`${proName} raises your daily research limit and unlocks knowledge bases and chat with cited sources.`}
            />
          ) : null}

          <RecentResearchesSection />

          {sub.canBuildKb && recentKbs.length > 0 && (
            <section aria-labelledby="recent-kbs" className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="recent-kbs" className="text-title text-foreground">
                  Recent knowledge bases
                </h2>
                <Link
                  href="/app/kb"
                  prefetch={false}
                  className="text-label text-primary underline-offset-2 hover:underline"
                >
                  View all
                </Link>
              </div>
              <Stagger tone="app" immediate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentKbs.map((kb, index) => (
                  <StaggerItem key={kb.kbId} index={index} tone="app">
                    <KbTile kb={kb} />
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}
        </div>
      )}

      {phase !== "search" && (loading || research || researchFailed) && (
        <div className="flex flex-col gap-6">
          <Reveal tone="app" immediate className="flex flex-col gap-1">
            <p className="font-mono text-label text-foreground-secondary">Research</p>
            <h1 className="text-headline break-words text-foreground">
              {research?.topic ?? activeTopic}
            </h1>
          </Reveal>

          {phase === "results" && (loading || researchFailed) && (
            <JobStatus
              title="Researching"
              railLabel="Research progress"
              steps={researchSteps}
              progress={progressPct}
              progressText={`Step ${
                Math.max(
                  1,
                  RESEARCH_STAGES.findIndex((stage) => stage.id === researchStage) + 1
                )
              } of ${RESEARCH_STAGES.length}`}
              current={progressMsg || "Starting research"}
              startedAt={startedAt}
              stalled={stalled}
              onKeepWaiting={touchProgress}
              error={researchFailed ? error : undefined}
              retryLabel={resumeSessionId ? "Resume from checkpoint" : "Try again"}
              onRetry={() =>
                void handleSearch(activeTopic, { resume: Boolean(resumeSessionId) })
              }
            />
          )}

          {phase === "results" && loading && (
            liveResearchEmpty ? (
              <VideoResultsSkeletonList count={5} />
            ) : (
              <ResearchLiveView live={liveResearch} />
            )
          )}

          {phase === "building" && loading && (
            <div className="flex flex-col gap-3">
              <KbBuildProgress
                detail={progressMsg}
                progress={liveBuildStatus?.progress ?? progressPct}
                videoCount={buildVideoCount}
                processedVideos={liveBuildStatus?.processedVideos}
                totalVideos={liveBuildStatus?.totalVideos}
                estimatedRemaining={formatKbBuildRemaining(
                  liveBuildStatus?.estimatedSecondsRemaining ?? null
                )}
                estimatedEta={formatKbBuildEta(liveBuildStatus?.estimatedCompletionAt ?? null)}
                startedAt={startedAt}
                stalled={stalled}
                onKeepWaiting={touchProgress}
              />
              {activeBuildKbId && (
                <p className="text-body-sm text-foreground-secondary">
                  <Link
                    href={`/app/kb/${activeBuildKbId}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Open build status
                  </Link>
                  {" "}
                  — safe to leave; progress syncs across devices.
                </p>
              )}
            </div>
          )}

          {research && (researchDone || phase === "building") && (
            <>
              {researchDone && ranked.length > 0 && sub.canBuildKb && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <Checkbox
                    checked={useSpeechToText}
                    onCheckedChange={(checked) => setUseSpeechToText(checked === true)}
                    aria-describedby="stt-build-hint"
                  />
                  <span className="flex flex-col gap-1 text-body-sm">
                    <span className="font-medium text-foreground">Use OpenRouter speech-to-text</span>
                    <span id="stt-build-hint" className="text-foreground-secondary">
                      Transcribe audio with Whisper via OpenRouter instead of YouTube captions.
                      Slower and uses paid STT; choose this when captions are missing or blocked.
                    </span>
                  </span>
                </label>
              )}

              {researchDone && ranked.length > 0 && (
                <ActionDock
                  actions={
                    sub.loading ? (
                      <Skeleton className="h-10 w-44" />
                    ) : sub.canBuildKb ? (
                      <Button
                        onClick={() => void handleBuildKB()}
                        disabled={selectedIds.size === 0 || kbBuildLimitReached}
                        title={kbBuildQuotaMessage}
                      >
                        {useSpeechToText ? "Build with speech-to-text" : "Build knowledge base"}
                      </Button>
                    ) : (
                      <Link
                        href="/pricing"
                        className={buttonVariants({ variant: "default" })}
                      >
                        See plans
                      </Link>
                    )
                  }
                >
                  {sub.canBuildKb ? (
                    kbBuildLimitReached ? (
                      kbBuildQuotaMessage
                    ) : selectedIds.size === 0 ? (
                      "Select at least one video to build a knowledge base"
                    ) : (
                      <>
                        <span className="font-mono tabular-nums">{selectedIds.size}</span> of{" "}
                        <span className="font-mono tabular-nums">{ranked.length}</span> videos selected
                      </>
                    )
                  ) : (
                    <>
                      <span className="font-mono tabular-nums">{ranked.length}</span> relevant videos
                      ranked. Knowledge bases are on paid plans.
                    </>
                  )}
                </ActionDock>
              )}

              {buildError && (
                <Alert variant="destructive">
                  <WarningCircle weight="fill" aria-hidden />
                  <AlertTitle>Couldn&apos;t build the knowledge base</AlertTitle>
                  <AlertDescription>{buildError}</AlertDescription>
                  <AlertAction>
                    <Button variant="outline" size="sm" onClick={() => void handleBuildKB()}>
                      Try again
                    </Button>
                  </AlertAction>
                </Alert>
              )}

              <div className={cn(phase === "building" && "pointer-events-none opacity-60")}>
                <ResearchResults
                  research={research}
                  ranked={ranked}
                  selectable={sub.canBuildKb && phase === "results"}
                  selectedIds={selectedIds}
                  onToggle={toggleVideo}
                  onSelectTop={selectTop}
                  onSelectAll={selectAll}
                  onClear={clearSelection}
                  topCount={TOP_COUNT}
                />
              </div>

              {researchDone && !sub.loading && !sub.canBuildKb && ranked.length > 0 && (
                <>
                  <FreeTierTeaser research={research} />
                  <UpgradePrompt
                    title="Unlock knowledge base and chat"
                    description={`${proName} transcribes the videos you pick, builds a knowledge base, and lets you chat with cited sources.`}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}
    </AppPage>
  );
}
