"use client";

import { Fragment } from "react";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { MOTION } from "@/lib/motion";

interface Props {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
}

/**
 * M3: hero word reveal (<= 12 words). The sentence stays in the DOM as plain text via
 * aria-label; word spans are aria-hidden. Reduced motion shows the text instantly.
 */
export default function HeroText({ text, as = "h1", className }: Props) {
  const words = text.split(" ");
  const Component = m[as];
  const animated = words.length <= 12;

  if (!animated) {
    const Plain = as;
    return <Plain className={className}>{text}</Plain>;
  }

  return (
    <Component
      className={cn(className)}
      aria-label={text}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
    >
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden="true">
            <m.span
              className="inline-block"
              variants={{
                hidden: { y: "100%", opacity: 0 },
                visible: {
                  y: 0,
                  opacity: 1,
                  transition: { duration: MOTION.duration.hero, ease: MOTION.ease },
                },
              }}
            >
              {word}
            </m.span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </Component>
  );
}
