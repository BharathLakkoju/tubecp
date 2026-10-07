/**
 * Evergreen motion tokens (design system §5, §7.1).
 * CSS twins live in app/globals.css (--duration-*, --stagger-*, --ease-*).
 * Reduced motion is handled once, by <MotionConfig reducedMotion="user"> in MotionProvider.
 */
export const MOTION = {
  duration: {
    instant: 0.08,
    fast: 0.14,
    base: 0.22,
    slow: 0.36,
    reveal: 0.52,
    hero: 0.72,
  },
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  easeInOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  stagger: {
    marketing: 0.06,
    app: 0.03,
  },
  distance: {
    app: 6,
    marketing: 16,
  },
  /** Max children that get a stagger delay (§5). Later children enter together. */
  staggerCap: 8,
} as const;

export const spring = {
  lift: { type: "spring", stiffness: 380, damping: 30 },
} as const;

/** M1: section / element reveal. */
export function revealVariants(distance: number = MOTION.distance.marketing, duration: number = MOTION.duration.reveal) {
  return {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: MOTION.ease },
    },
  } as const;
}

/** M2 parent: staggers `visible` on children. */
export function staggerVariants(step: number = MOTION.stagger.marketing, delayChildren = 0.08) {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: step, delayChildren } },
  } as const;
}

/** M15: route content fade. */
export const routeFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: MOTION.duration.fast, ease: MOTION.ease } },
} as const;

/** M11 / M14: live list insert, message enter. */
export const listItem = {
  initial: { opacity: 0, y: MOTION.distance.app },
  animate: { opacity: 1, y: 0, transition: { duration: MOTION.duration.base, ease: MOTION.ease } },
  exit: { opacity: 0, transition: { duration: MOTION.duration.fast, ease: MOTION.ease } },
} as const;
