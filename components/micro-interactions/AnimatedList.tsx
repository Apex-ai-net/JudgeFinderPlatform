'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface AnimatedListProps {
  children: React.ReactNode[]
  staggerDelay?: number
  className?: string
}

export function AnimatedList({
  children,
  staggerDelay = 0.1,
  className
}: AnimatedListProps) {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldReduceMotion(mediaQuery.matches)

    const handleChange = () => setShouldReduceMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
