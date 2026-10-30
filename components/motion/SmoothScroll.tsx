"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import "lenis/dist/lenis.css";

/** Lenis smooth scrolling for the document; native wheel scrolling when the user prefers reduced motion. */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        lerp: 0.1,
        smoothWheel: !reduceMotion,
        anchors: reduceMotion ? false : { offset: -88 },
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
