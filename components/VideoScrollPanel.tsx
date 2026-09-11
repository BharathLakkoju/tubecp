import type { VideoSummary } from "@/lib/types";

interface Props {
  title: string;
  videos: VideoSummary[];
  emptyMessage?: string;
  scores?: Record<string, number>;
}

export default function VideoScrollPanel({
  title,
  videos,
  emptyMessage = "No videos found.",
  scores,
}: Props) {
  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-[13px] font-semibold text-text">{title}</h3>
        <span className="shrink-0 font-mono text-xs text-text-muted">{videos.length}</span>
      </div>

      <div className="max-h-80 overflow-y-auto border border-border bg-surface">
        {videos.length === 0 ? (
          <p className="px-4 py-6 text-center font-mono text-xs text-text-muted">{emptyMessage}</p>
        ) : (
          <ul>
            {videos.map((video) => {
              const score = scores?.[video.videoId];

              return (
                <li key={video.videoId} className="border-b border-border last:border-b-0">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 p-3 no-underline transition-colors hover:bg-bg"
                  >
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      width={120}
                      height={68}
                      loading="lazy"
                      className="h-[68px] w-[120px] shrink-0 border border-border object-cover bg-bg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[13px] leading-snug font-medium text-text line-clamp-2">
                        {video.title}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-text-muted line-clamp-1">
                        {video.channel}
                      </p>
                      {score !== undefined && (
                        <p className="mt-1.5 font-mono text-[11px] text-accent">
                          relevance {score}
                        </p>
                      )}
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
