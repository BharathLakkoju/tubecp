"use client";

import { useState } from "react";
import { m, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { MOTION } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Props {
  /** Left-hand summary, e.g. "20 of 44 selected". */
  children: React.ReactNode;
  /** Right-hand primary actions (use a ButtonGroup). */
  actions: React.ReactNode;
  className?: string;
}

/**
 * Action dock (signature piece, design system §6.11): sticky bar with the screen's next actions.
 * Glass + shadow-2 appear once the page scrolls past 8px (M6). Moves to the bottom on mobile.
 */
export default function ActionDock({ children, actions, className }: Props) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (value) => setScrolled(value > 8));

  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION.duration.slow, ease: MOTION.ease }}
      className={cn(
        "sticky top-2 z-20 max-md:fixed max-md:inset-x-2 max-md:top-auto max-md:bottom-[max(0.5rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      <Card
        size="sm"
        data-scrolled={scrolled}
        className="rounded-xl py-0 transition-[background-color,box-shadow] duration-(--duration-slow) data-[scrolled=true]:bg-card/85 data-[scrolled=true]:shadow-2 data-[scrolled=true]:backdrop-blur-md data-[scrolled=true]:backdrop-saturate-150 max-md:shadow-2"
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
          <p className="text-label text-foreground">{children}</p>
          {actions}
        </CardContent>
      </Card>
    </m.div>
  );
}
