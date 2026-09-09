"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface Props {
  phase: string;
  children: React.ReactNode;
  className?: string;
}

export default function PhasePanel({ phase, children, className }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeUp}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
