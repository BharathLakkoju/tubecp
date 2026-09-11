"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article";
}

export default function FadeIn({ children, className, delay = 0, as = "div" }: Props) {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const Component = motion[as];
  const Tag = as;

  if (reduced || !hydrated) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Component
      initial="hidden"
      animate="visible"
      variants={{
        hidden: fadeUp.hidden,
        visible: {
          ...fadeUp.visible,
          transition: {
            ...fadeUp.visible.transition,
            delay,
          },
        },
      }}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}
