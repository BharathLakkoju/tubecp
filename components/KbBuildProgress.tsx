"use client";

import LoadingSpinner from "@/components/LoadingSpinner";
import ProgressBar from "@/components/ProgressBar";
import { useRotatingStatus } from "@/lib/hooks/useRotatingStatus";

const KB_BUILD_PHRASES = [
  "Fetching transcript",
  "Transcribing",
  "Chunking content",
  "Contextualizing",
  "Generating embeddings",
  "Indexing videos",
];

interface Props {
  detail?: string;
  progress: number;
  active: boolean;
}

export default function KbBuildProgress({ detail, progress, active }: Props) {
  const status = useRotatingStatus(KB_BUILD_PHRASES, active);

  return (
    <div className="motion-fade-up">
      <div className="mb-4 flex items-center gap-3 border border-border bg-surface px-4 py-3">
        <LoadingSpinner size="sm" />
        <div className="min-w-0">
          <p className="font-sans text-sm text-text">{status}</p>
          {detail && (
            <p className="mt-1 font-sans text-xs text-text-muted line-clamp-2">{detail}</p>
          )}
        </div>
      </div>

      <ProgressBar message="Building knowledge base" progress={progress} />
    </div>
  );
}
