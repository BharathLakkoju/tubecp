"use client";

import RankedVideoList from "@/components/tubecp/RankedVideoList";
import { QueryList } from "@/components/ResearchResults";
import type { ResearchLiveState } from "@/lib/types";

interface Props {
  live: ResearchLiveState;
}

/** Partial research data streamed in while the pipeline runs. */
export default function ResearchLiveView({ live }: Props) {
  const hasQueries = live.queries.length > 0;
  const hasScraped = live.allVideos.length > 0;
  const hasAnalyzed = live.analyzedVideos.length > 0;

  if (!hasQueries && !hasScraped && !hasAnalyzed) return null;

  return (
    <div className="flex flex-col gap-6">
      {hasQueries && (
        <section aria-labelledby="live-queries">
          <h3 id="live-queries" className="text-title-sm text-foreground">
            Search queries
          </h3>
          <QueryList queries={live.queries} />
        </section>
      )}

      {(hasScraped || hasAnalyzed) && (
        <div className="grid gap-6 md:grid-cols-2">
          {hasScraped && (
            <RankedVideoList
              title="Videos found"
              caption={`${live.allVideos.length} so far`}
              videos={live.allVideos}
              emptyMessage="No videos were returned from YouTube search."
              maxHeightClass="max-h-[28rem]"
            />
          )}
          {hasAnalyzed && (
            <RankedVideoList
              title="Analyzed"
              caption={`${live.analyzedVideos.length} so far`}
              videos={live.analyzedVideos}
              scores={live.analyzedScores}
              maxHeightClass="max-h-[28rem]"
            />
          )}
        </div>
      )}
    </div>
  );
}
