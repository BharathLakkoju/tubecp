"use client";

import { m } from "framer-motion";
import { MOTION } from "@/lib/motion";

/** M15: route content fades in (120ms). Reduced motion drops it via MotionConfig. */
export default function ProductTemplate({ children }: { children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: MOTION.duration.fast, ease: MOTION.ease }}
    >
      {children}
    </m.div>
  );
}
