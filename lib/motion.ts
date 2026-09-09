export const MOTION = {
  duration: {
    fast: 0.15,
    base: 0.28,
    slow: 0.4,
  },
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  distance: {
    sm: 6,
    md: 10,
  },
  stagger: 0.06,
} as const;

export const fadeUp = {
  hidden: { opacity: 0, y: MOTION.distance.sm },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION.duration.base, ease: MOTION.ease },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: MOTION.duration.fast, ease: MOTION.ease },
  },
} as const;

export const fadeUpStaggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: MOTION.stagger,
      delayChildren: 0.04,
    },
  },
} as const;

export const fadeUpStaggerItem = {
  hidden: { opacity: 0, y: MOTION.distance.sm },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION.duration.base, ease: MOTION.ease },
  },
} as const;
