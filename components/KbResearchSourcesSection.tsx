"use client";

import Link from "next/link";
import RankedVideoList from "@/components/tubecp/RankedVideoList";
import { Badge } from "@/components/ui/badge";
import type { KbTranscriptMode, KnowledgeBase, RankedVideo } from "@/lib/types";

export interface KbResearchSourcesSectionProps {
  topic: string;
  videos: RankedVideo[];
  kbId?: string;
  kbStatus?: KnowledgeBase["status"];
  indexedVideoIds?: string[];
  transcriptMode?: KbTranscriptMode;
  /** Tighter copy for the research-sources sheet. */
  variant?: "page" | "sheet";
}

export default function KbResearchSourcesSection({
  topic,
  videos,
  kbId,
  kbStatus,
  indexedVideoIds = [],
  transcriptMode = "captions",
  variant = "page",
}: KbResearchSourcesSectionProps) {
  if (videos.length === 0) {
    return (
      <section className="flex flex-col gap-2" aria-labelledby="kb-sources-heading">
        <h2 id="kb-sources-heading" className="text-title-sm text-foreground">
          Research videos
        </h2>
        <p className="text-body-sm text-foreground-secondary">
          No ranked videos were saved for this knowledge base. Start a new research run to pick
          videos again.
        </p>
      </section>
    );
  }

  const indexedSet = new Set(indexedVideoIds);
  const indexedCount = videos.filter((v) => indexedSet.has(v.videoId)).length;
  const scores = Object.fromEntries(videos.map((video) => [video.videoId, video.relevanceScore]));

  const modeLabel =
    transcriptMode === "stt"
      ? "OpenRouter speech-to-text"
      : "YouTube captions";

  const sheet = variant === "sheet";

  return (
    <section className="flex flex-col gap-4" aria-labelledby="kb-sources-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="kb-sources-heading" className="text-title-sm text-foreground">
          {sheet ? "Ranked videos" : `Research videos for "${topic}"`}
        </h2>
        <Badge variant="outline">{modeLabel}</Badge>
        {kbId && !sheet && (
          <Link
            href={`/app/kb/${kbId}`}
            className="text-label text-primary underline-offset-2 hover:underline"
          >
            KB details
          </Link>
        )}
      </div>
      {!sheet && (
        <p className="text-body-sm text-foreground-secondary">
          These are the videos ranked during research (relevance scores and summaries). Use this list
          to confirm the build used the right sources, even when indexing failed.
          {kbStatus && (
            <>
              {" "}
              <span className="font-mono tabular-nums">
                {indexedCount}/{videos.length}
              </span>{" "}
              indexed
              {kbStatus === "building" ? " so far" : ""}.
            </>
          )}
        </p>
      )}
      {sheet && kbStatus && (
        <p className="text-body-sm text-foreground-secondary">
          Sorted by relevance from your research run.{" "}
          <span className="font-mono tabular-nums">
            {indexedCount}/{videos.length}
          </span>{" "}
          indexed.
        </p>
      )}
      <RankedVideoList
        title={sheet ? "All ranked videos" : "Analyzed videos"}
        caption="sorted by relevance · scores from research"
        videos={videos}
        scores={scores}
        numbered
        pageSize={sheet ? videos.length : 15}
        copyable
        rowLayout={sheet ? "panel" : "default"}
      />
    </section>
  );
}
