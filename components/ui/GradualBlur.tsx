'use client'

import { motion, Variants } from 'framer-motion'
import { ReactNode } from 'react'

interface GradualBlurProps {
  children: ReactNode
  duration?: number
  delay?: number
  blur?: string
  className?: string
  yOffset?: number
}

/**
 * GradualBlur - A component that animates its children from blurred to clear
 *
 * Features:
 * - Configurable blur amount, duration, and delay
 * - Smooth opacity and vertical position transitions
 * - Customizable easing curve
 *
 * @example
 * ```tsx
 * <GradualBlur delay={0.2}>
 *   <h1>Animated Heading</h1>
 * </GradualBlur>
 * ```
 */
export function GradualBlur({
  children,
  duration = 0.8,
  delay = 0,
  blur = '10px',
  className = '',
  yOffset = 20,
}: GradualBlurProps): JSX.Element {
  const variants: Variants = {
    hidden: {
      filter: `blur(${blur})`,
      opacity: 0,
      y: yOffset,
    },
    visible: {
      filter: 'blur(0px)',
      opacity: 1,
      y: 0,
    },
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1], // Custom easing curve for smooth animation
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
