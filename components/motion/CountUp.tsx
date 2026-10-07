"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { MOTION } from "@/lib/motion";

interface Props {
  value: number;
  /** Seconds. Marketing 0.9, app <= 0.6. */
  duration?: number;
  format?: (value: number) => string;
  className?: string;
}

/**
 * M7: count-up number. The final value is in the DOM from the start (so SSR, screen readers and
 * reduced motion see it immediately); the animation only rewrites the text on the client.
 */
export default function CountUp({ value, duration = 0.6, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const fmt = format ?? ((n: number) => String(Math.round(n)));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!inView || reduced) {
      node.textContent = fmt(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: MOTION.ease,
      onUpdate: (latest) => {
        node.textContent = fmt(latest);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, value, duration]);

  return (
    <span ref={ref} className={className}>
      {fmt(value)}
    </span>
  );
}
