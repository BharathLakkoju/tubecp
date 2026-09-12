"use client";

import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";
import type { ResearchResult } from "@/lib/types";
import VideoScrollPanel from "@/components/VideoScrollPanel";

interface Props {
  research: ResearchResult;
  showCopyLinks?: boolean;
}

export default function ResearchResults({ research, showCopyLinks = false }: Props) {
  const [copied, setCopied] = useState(false);

  const copyAllLinks = async () => {
    const links = research.rankedVideos.map((video) => video.url).join("\n");
    if (!links) return;

    try {
      await navigator.clipboard.writeText(links);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <VideoScrollPanel
        title="All videos scraped"
        videos={research.allVideos}
        emptyMessage="No videos were returned from YouTube search."
      />
      <div className="flex min-h-0 flex-col">
        {showCopyLinks && research.rankedVideos.length > 0 && (
          <div className="mb-3 flex justify-end">
            <button type="button" className="app-copy-links-btn" onClick={copyAllLinks}>
              {copied ? (
                <>
                  <Check size={14} weight="bold" aria-hidden />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} weight="regular" aria-hidden />
                  Copy all links
                </>
              )}
            </button>
          </div>
        )}
        <VideoScrollPanel
          title="Best semantic matches"
          videos={research.rankedVideos}
          emptyMessage="No videos met the relevance threshold for this topic."
          scores={Object.fromEntries(
            research.rankedVideos.map((video) => [video.videoId, video.relevanceScore])
          )}
        />
      </div>
    </div>
  );
}
