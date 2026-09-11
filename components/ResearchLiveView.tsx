import type { ResearchLiveState } from "@/lib/types";
import ExpandedQueriesPanel from "@/components/ExpandedQueriesPanel";
import VideoScrollPanel from "@/components/VideoScrollPanel";

interface Props {
  live: ResearchLiveState;
}

export default function ResearchLiveView({ live }: Props) {
  const hasQueries = live.queries.length > 0;
  const hasScraped = live.allVideos.length > 0;
  const hasAnalyzed = live.analyzedVideos.length > 0;

  if (!hasQueries && !hasScraped && !hasAnalyzed) return null;

  return (
    <div className="mt-6 flex flex-col gap-6">
      {hasQueries && <ExpandedQueriesPanel queries={live.queries} />}

      {(hasScraped || hasAnalyzed) && (
        <div className="grid gap-6 md:grid-cols-2">
          {hasScraped && (
            <VideoScrollPanel
              title="All videos scraped"
              videos={live.allVideos}
              emptyMessage="No videos were returned from YouTube search."
            />
          )}
          {hasAnalyzed && (
            <VideoScrollPanel
              title="Videos analyzed"
              videos={live.analyzedVideos}
              scores={live.analyzedScores}
            />
          )}
        </div>
      )}
    </div>
  );
}
