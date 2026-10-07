"use client";

import { m, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Lift distance in px: 4 on marketing, 2 in the app (§7.3). */
  lift?: number;
  /** Optional pointer spotlight (marketing only). */
  spotlight?: boolean;
}

/**
 * M4: card hover lift with shadow-1 -> shadow-3 and an optional spotlight.
 * Reduced motion: no lift and no spotlight, only the shadow change.
 */
export default function LiftCard({ children, className, lift = 4, spotlight = false }: Props) {
  const reduced = useReducedMotion();

  return (
    <m.div
      className={cn(
        "group/lift relative rounded-xl shadow-1 transition-shadow duration-(--duration-base) hover:shadow-3",
        className
      )}
      whileHover={reduced ? undefined : { y: -lift }}
      transition={spring.lift}
      onPointerMove={
        spotlight
          ? (event) => {
              if (reduced) return;
              const rect = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
              event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
            }
          : undefined
      }
    >
      {spotlight ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-(--duration-base) group-hover/lift:opacity-100 motion-reduce:hidden"
          style={{
            background:
              "radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklch, var(--primary) 10%, transparent), transparent 70%)",
          }}
        />
      ) : null}
      {children}
    </m.div>
  );
}
