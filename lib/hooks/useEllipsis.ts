"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const FRAMES = [".", "..", "..."] as const;

/** Cycles through ".", "..", "..." for loading labels. */
export function useEllipsis(intervalMs = 600): string {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, reduced]);

  return FRAMES[frame];
}
