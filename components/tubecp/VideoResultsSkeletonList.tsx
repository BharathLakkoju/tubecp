"use client";

import { useEffect, useState } from "react";
import VideoResultSkeleton from "@/components/tubecp/VideoResultSkeleton";
import { cn } from "@/lib/utils";

interface Props {
  count?: number;
  className?: string;
  /** Design system §6.10: avoid flashing skeletons on fast responses. */
  delayMs?: number;
}

export default function VideoResultsSkeletonList({
  count = 3,
  className,
  delayMs = 150,
}: Props) {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);

  if (!visible) {
    return <div className={cn("min-h-48", className)} aria-hidden="true" />;
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col divide-y overflow-x-clip rounded-lg border bg-card",
        className
      )}
      aria-busy="true"
    >
      <span className="sr-only">Loading results</span>
      {Array.from({ length: count }, (_, index) => (
        <VideoResultSkeleton key={index} rank={index + 1} />
      ))}
    </div>
  );
}
