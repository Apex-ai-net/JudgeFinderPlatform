'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { type ReactNode, useEffect, useState } from 'react'

interface SlideInViewProps {
  children: ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  className?: string
}

const directionOffset = {
  up: { y: 40, x: 0 },
  down: { y: -40, x: 0 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 }
}

export function SlideInView({
  children,
  direction = 'up',
  delay = 0,
  className
}: SlideInViewProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldReduceMotion(mediaQuery.matches)

    const handleChange = () => setShouldReduceMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const offset = directionOffset[direction]

  // Respect reduced motion preference
  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        x: offset.x,
        y: offset.y,
      }}
      animate={inView ? {
        opacity: 1,
        x: 0,
        y: 0,
      } : {}}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
