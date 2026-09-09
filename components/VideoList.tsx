import type { RankedVideo } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  videos: RankedVideo[];
}

export default function VideoList({ videos }: Props) {
  return (
    <div className="flex flex-col">
      {videos.map((video, i) => (
        <div
          key={video.videoId}
          style={{ "--motion-index": i } as React.CSSProperties}
          className="motion-stagger-item flex border-t border-border last:border-b max-sm:flex-col"
        >
          <div className="flex min-w-12 shrink-0 items-start justify-center px-2 py-4 font-mono text-xs text-accent max-sm:justify-start max-sm:px-4 max-sm:pt-3 max-sm:pb-0">
            {String(i + 1).padStart(2, "0")}
          </div>
          <div className="min-w-0 flex-1 py-4 pr-4 max-sm:px-4 max-sm:pt-2 max-sm:pb-3">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1.5 block font-mono text-[13px] leading-snug font-semibold text-text no-underline hover:text-accent-hover"
            >
              {video.title}
            </a>
            <div className="mb-1.5 flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs break-words text-text-muted">{video.channel}</span>
              <span
                className={cn(
                  "shrink-0 border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase",
                  video.discussionLevel === "substantial"
                    ? "border-success text-success"
                    : "border-warning text-warning"
                )}
              >
                {video.discussionLevel}
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed text-text-muted">{video.whyRelevant}</p>
          </div>
          <div className="flex min-w-16 shrink-0 flex-col items-center justify-center border-l border-border px-3 py-4 max-sm:w-full max-sm:flex-row max-sm:justify-start max-sm:gap-2 max-sm:border-t max-sm:border-l-0 max-sm:px-4 max-sm:py-3">
            <span className="font-mono text-lg font-semibold text-accent max-sm:text-sm">
              {video.relevanceScore}
            </span>
            <span className="font-mono text-[10px] tracking-wide text-text-muted uppercase">
              relevance
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
