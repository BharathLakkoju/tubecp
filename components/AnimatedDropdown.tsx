"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MOTION } from "@/lib/motion";
import { cn } from "@/lib/cn";

const panelVariants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: MOTION.duration.fast, ease: MOTION.ease },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: MOTION.duration.base, ease: MOTION.ease },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.98,
    transition: { duration: MOTION.duration.fast, ease: MOTION.ease },
  },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: MOTION.stagger,
      delayChildren: 0.03,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION.duration.base, ease: MOTION.ease },
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: { duration: MOTION.duration.fast, ease: MOTION.ease },
  },
};

interface Props {
  open: boolean;
  className?: string;
  children: React.ReactNode;
  role?: string;
}

export function AnimatedDropdown({ open, className, children, role }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return open ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={className}
          role={role}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={panelVariants}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={listVariants}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AnimatedDropdownItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={cn(className)} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
