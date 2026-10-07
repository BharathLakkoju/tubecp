"use client";

import { Children, cloneElement, isValidElement } from "react";
import { m } from "framer-motion";
import { MOTION, revealVariants } from "@/lib/motion";

type Tag = "div" | "ul" | "ol" | "section";
type ItemTag = "div" | "li" | "article";
type Tone = "app" | "marketing";

interface Props {
  children: React.ReactNode;
  className?: string;
  tone?: Tone;
  /** Animate on mount instead of on scroll. */
  immediate?: boolean;
  as?: Tag;
}

/**
 * M2: staggered children. Wrap each child in <StaggerItem>; indexes are injected automatically.
 * Only the first 8 items get a delay (design system §5), later items enter together.
 */
export default function Stagger({
  children,
  className,
  tone = "marketing",
  immediate = false,
  as = "div",
}: Props) {
  const Component = m[as];
  const wrapped = Children.toArray(children).map((child, index) =>
    isValidElement<StaggerItemProps>(child) && child.type === StaggerItem
      ? cloneElement(child, { index, tone })
      : child
  );
  const parent = { hidden: {}, visible: {} };

  if (immediate) {
    return (
      <Component className={className} initial="hidden" animate="visible" variants={parent}>
        {wrapped}
      </Component>
    );
  }

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={parent}
    >
      {wrapped}
    </Component>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  as?: ItemTag;
  /** Injected by <Stagger>. */
  index?: number;
  tone?: Tone;
}

export function StaggerItem({
  children,
  className,
  as = "div",
  index = 0,
  tone = "marketing",
}: StaggerItemProps) {
  const step = tone === "app" ? MOTION.stagger.app : MOTION.stagger.marketing;
  const distance = tone === "app" ? MOTION.distance.app : MOTION.distance.marketing;
  const duration = tone === "app" ? MOTION.duration.base : MOTION.duration.reveal;
  const base = revealVariants(distance, duration);
  const delay = Math.min(index, MOTION.staggerCap) * step + (tone === "marketing" ? 0.08 : 0);
  const Component = m[as];

  return (
    <Component
      className={className}
      variants={{
        hidden: base.hidden,
        visible: { ...base.visible, transition: { ...base.visible.transition, delay } },
      }}
    >
      {children}
    </Component>
  );
}
