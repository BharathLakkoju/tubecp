"use client";

import { LazyMotion, MotionConfig } from "framer-motion";

// Async feature bundle: keeps framer-motion out of the critical path (design system §7.2 rules).
const loadFeatures = () => import("./features").then((mod) => mod.default);

/**
 * One-time motion setup (design system §7): LazyMotion keeps the bundle small,
 * MotionConfig turns transforms/layout animations off for users who prefer reduced motion.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
