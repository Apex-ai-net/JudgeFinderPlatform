/**
 * JudgeFinder Animation Presets
 * Reusable animation configurations for Framer Motion
 */

import { Variants } from 'framer-motion'

// Duration constants
export const duration = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
} as const

// Easing curves (cubic bezier curves)
export const easing = {
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  easeOut: [0, 0, 0.2, 1] as [number, number, number, number],
  easeIn: [0.4, 0, 1, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
}

// Fade Animations
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
}

// Scale Animations
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
}

export const scaleInSpring: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  exit: { opacity: 0, scale: 0.8 },
}

// Slide Animations
export const slideInUp: Variants = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0 },
}

export const slideInDown: Variants = {
  initial: { y: '-100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '-100%', opacity: 0 },
}

export const slideInLeft: Variants = {
  initial: { x: '-100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0 },
}

export const slideInRight: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
}

// Stagger Container
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
}

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
}

// Hover Presets
export const hoverScale = {
  scale: 1.02,
  transition: { duration: duration.fast, ease: easing.easeOut },
}

export const hoverLift = {
  y: -4,
  scale: 1.01,
  transition: { duration: duration.fast, ease: easing.easeOut },
}

export const hoverGlow = {
  boxShadow: '0 0 20px rgba(37, 99, 235, 0.3)',
  transition: { duration: duration.normal, ease: easing.easeOut },
}

// Tap Presets
export const tapScale = {
  scale: 0.97,
  transition: { duration: duration.fast, ease: easing.easeIn },
}

export const tapPress = {
  scale: 0.95,
  opacity: 0.9,
  transition: { duration: duration.fast, ease: easing.easeIn },
}

// Card Hover Animation
export const cardHover: Variants = {
  initial: { scale: 1, y: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
    transition: { duration: duration.fast, ease: easing.easeOut },
  },
}

// Loading Animations
export const pulse: Variants = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: 1,
    transition: {
      repeat: Infinity,
      repeatType: 'reverse',
      duration: duration.slow,
    },
  },
}

export const shimmer: Variants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
}

// Page Transition Presets
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
}

// Modal Animations
export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.normal } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
}

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: duration.fast, ease: easing.easeIn },
  },
}

// Dropdown Animations
export const dropdown: Variants = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: duration.fast, ease: easing.easeOut },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: duration.fast, ease: easing.easeIn },
  },
}

// Toast Animations
export const toast: Variants = {
  initial: { opacity: 0, y: 50, scale: 0.8 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  exit: {
    opacity: 0,
    x: 300,
    transition: { duration: duration.fast, ease: easing.easeIn },
  },
}

// Number Counter Animation
export const counter = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.normal, ease: easing.easeOut },
}

// Utility function to create custom transition
export const createTransition = (
  durationValue: number = duration.normal,
  easingValue: [number, number, number, number] | string = easing.easeInOut,
  delay: number = 0
) => ({
  duration: durationValue,
  ease: easingValue,
  delay,
})

// Utility function to create spring transition
export const createSpring = (
  stiffness: number = 300,
  damping: number = 20,
  mass: number = 1
) => ({
  type: 'spring' as const,
  stiffness,
  damping,
  mass,
})

// Stagger Item (child variant for staggerContainer)
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

// Tap variant for touch interactions
export const tap: Variants = {
  initial: {},
  whileTap: { scale: 0.98 },
}

// Common transition presets
export const transitions = {
  fast: { duration: duration.fast, ease: easing.easeOut },
  smooth: { duration: duration.normal, ease: easing.easeInOut },
  spring: { type: 'spring' as const, stiffness: 300, damping: 20 },
  bounce: { type: 'spring' as const, stiffness: 400, damping: 10 },
}

// Export preset groups
export const animationPresets = {
  fade: { fadeIn, fadeInUp, fadeInDown, fadeInLeft, fadeInRight },
  scale: { scaleIn, scaleInSpring },
  slide: { slideInUp, slideInDown, slideInLeft, slideInRight },
  stagger: { staggerContainer, staggerContainerFast, staggerItem },
  hover: { hoverScale, hoverLift, hoverGlow },
  tap: { tapScale, tapPress, tap },
  card: { cardHover },
  loading: { pulse, shimmer },
  page: { pageTransition },
  modal: { modalBackdrop, modalContent },
  dropdown,
  toast,
  counter,
  transitions,
} as const

export type AnimationPresets = typeof animationPresets