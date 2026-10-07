"use client";

import { m } from "framer-motion";
import { MOTION, revealVariants } from "@/lib/motion";

type Tag = "div" | "section" | "article" | "li" | "ul" | "header" | "footer" | "p" | "h1" | "h2";

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Delay in seconds (e.g. 0.2 for hero subcopy). */
  delay?: number;
  /** "app" = 6px / 220ms, "marketing" = 16px / 520ms. */
  tone?: "app" | "marketing";
  /** Animate on mount instead of on scroll (above-the-fold content). */
  immediate?: boolean;
  as?: Tag;
}

/**
 * M1: fade-up reveal. Runs once. Reduced motion drops the transform (MotionConfig).
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  tone = "marketing",
  immediate = false,
  as = "div",
}: Props) {
  const distance = tone === "app" ? MOTION.distance.app : MOTION.distance.marketing;
  const duration = tone === "app" ? MOTION.duration.base : MOTION.duration.reveal;
  const base = revealVariants(distance, duration);
  const variants = {
    hidden: base.hidden,
    visible: {
      ...base.visible,
      transition: { ...base.visible.transition, delay },
    },
  };
  const Component = m[as];

  if (immediate) {
    return (
      <Component className={className} initial="hidden" animate="visible" variants={variants}>
        {children}
      </Component>
    );
  }

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={variants}
    >
      {children}
    </Component>
  );
}
