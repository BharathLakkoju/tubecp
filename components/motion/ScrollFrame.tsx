"use client";

import { useRef } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * M5: product shot "scroll frame". rotateX 12deg -> 0 and scale .96 -> 1 over the first 40% of
 * the scroll window. Fixed dimensions come from the caller (CLS <= 0.1). Static under reduced motion.
 */
export default function ScrollFrame({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotateX = useTransform(scrollYProgress, [0, 0.4], [12, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.96, 1]);

  return (
    <div ref={ref} className={cn("[perspective:1200px]", className)}>
      <m.div style={reduced ? undefined : { rotateX, scale, transformOrigin: "50% 100%" }}>
        {children}
      </m.div>
    </div>
  );
}
