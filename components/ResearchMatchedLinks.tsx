"use client";

import CopyButton from "@/components/CopyButton";
import type { RankedVideo } from "@/lib/types";

interface Props {
  videos: RankedVideo[];
}

export default function ResearchMatchedLinks({ videos }: Props) {
  if (videos.length === 0) return null;

  const linksText = videos.map((video) => video.url).join("\n");

  return (
    <section className="my-8" aria-label="Best semantic match links">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="font-mono text-[13px] font-semibold text-text">
            Best semantic match links
          </h3>
          <span className="shrink-0 font-mono text-xs text-text-muted">{videos.length}</span>
        </div>
        <CopyButton text={linksText} label="Copy all links" />
      </div>

      <div className="max-h-80 overflow-y-auto border border-border bg-surface">
        <ul>
          {videos.map((video) => (
            <li key={video.videoId} className="border-b border-border last:border-b-0">
              <div className="flex flex-col gap-1.5 p-3">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[13px] leading-snug font-medium text-text no-underline line-clamp-2 transition-colors hover:text-accent"
                >
                  {video.title}
                </a>
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] leading-relaxed text-text-muted break-all no-underline transition-colors hover:text-accent hover:underline"
                >
                  {video.url}
                </a>
                <p className="font-mono text-[11px] text-accent">
                  relevance {video.relevanceScore}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
