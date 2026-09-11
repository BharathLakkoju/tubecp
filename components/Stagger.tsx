"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { fadeUpStaggerContainer, fadeUpStaggerItem } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface Props {
  children: React.ReactNode;
  className?: string;
  as?: "ul" | "div";
}

export default function Stagger({ children, className, as = "div" }: Props) {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const Tag = as;

  if (reduced || !hydrated) {
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];

  return (
    <MotionTag
      initial="hidden"
      animate="visible"
      variants={fadeUpStaggerContainer}
      className={cn(className)}
    >
      {children}
    </MotionTag>
  );
}

interface ItemProps {
  children: React.ReactNode;
  className?: string;
  as?: "li" | "div";
}

export function StaggerItem({ children, className, as = "div" }: ItemProps) {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const Tag = as;

  if (reduced || !hydrated) {
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];

  return (
    <MotionTag variants={fadeUpStaggerItem} className={cn(className)}>
      {children}
    </MotionTag>
  );
}
