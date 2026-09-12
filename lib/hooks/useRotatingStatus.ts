"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useEllipsis } from "@/lib/hooks/useEllipsis";

export function useRotatingStatus(
  phrases: string[],
  active: boolean,
  intervalMs = 2200
): string {
  const reduced = useReducedMotion();
  const dots = useEllipsis();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || phrases.length === 0) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % phrases.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [active, phrases, intervalMs]);

  if (!active || phrases.length === 0) {
    return "";
  }

  const phrase = phrases[index] ?? phrases[0];
  return reduced ? `${phrase}.` : `${phrase}${dots}`;
}
