"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const LERP = 0.07;

/**
 * Soft mesh gradients for marketing routes. Pointer position shifts blob centers via CSS variables
 * (no layout thrash). Static under reduced motion — design system §7, no competing "AI glow".
 */
export default function MarketingAmbientBackground() {
  const reduced = useReducedMotion();
  const layerRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0.5, y: 0.45 });
  const current = useRef({ x: 0.5, y: 0.45 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;

    const apply = () => {
      const el = layerRef.current;
      if (!el) return;
      const dx = (current.current.x - 0.5) * 28;
      const dy = (current.current.y - 0.5) * 22;
      el.style.setProperty("--mesh-a-x", `${52 + dx}%`);
      el.style.setProperty("--mesh-a-y", `${42 + dy}%`);
      el.style.setProperty("--mesh-b-x", `${28 - dx * 0.65}%`);
      el.style.setProperty("--mesh-b-y", `${72 - dy * 0.55}%`);
      el.style.setProperty("--mesh-c-x", `${78 + dx * 0.35}%`);
      el.style.setProperty("--mesh-c-y", `${18 + dy * 0.4}%`);
    };

    const onMove = (event: PointerEvent) => {
      target.current = {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      };
    };

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * LERP;
      current.current.y += (target.current.y - current.current.y) * LERP;
      apply();
      rafRef.current = requestAnimationFrame(tick);
    };

    apply();
    window.addEventListener("pointermove", onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  return (
    <div aria-hidden="true" className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden")}>
      <div className="absolute inset-0 bg-background" />
      <div ref={layerRef} className="marketing-mesh absolute inset-0" />
      <div className="marketing-mesh-grain absolute inset-0 opacity-[0.35] dark:opacity-[0.2]" />
    </div>
  );
}
