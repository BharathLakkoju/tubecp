import type { ResearchResult } from "@/lib/types";
import VideoScrollPanel from "@/components/VideoScrollPanel";

interface Props {
  research: ResearchResult;
}

export default function ResearchResults({ research }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <VideoScrollPanel
        title="All videos scraped"
        videos={research.allVideos}
        emptyMessage="No videos were returned from YouTube search."
      />
      <VideoScrollPanel
        title="Best semantic matches"
        videos={research.rankedVideos}
        emptyMessage="No videos met the relevance threshold for this topic."
        scores={Object.fromEntries(
          research.rankedVideos.map((video) => [video.videoId, video.relevanceScore])
        )}
      />
    </div>
  );
}
