"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { fadeUp } from "@/lib/motion";

interface Props {
  children: React.ReactNode;
}

const shellClass = "flex min-h-0 flex-1 flex-col";

export default function PageTransition({ children }: Props) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const hydrated = useHydrated();

  if (reduced || !hydrated) {
    return <div className={shellClass}>{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className={shellClass}
    >
      {children}
    </motion.div>
  );
}
