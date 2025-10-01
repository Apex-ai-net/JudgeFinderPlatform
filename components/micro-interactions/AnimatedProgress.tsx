'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useEffect, useState } from 'react'

interface AnimatedProgressProps {
  value: number // 0-100
  color?: string
  height?: string
  className?: string
  showValue?: boolean
  duration?: number
}

export function AnimatedProgress({
  value,
  color = 'bg-primary',
  height = 'h-2',
  className = '',
  showValue = false,
  duration = 1.5
}: AnimatedProgressProps) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldReduceMotion(mediaQuery.matches)

    const handleChange = () => setShouldReduceMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <div className={`w-full ${height} bg-muted rounded-full overflow-hidden`}>
        <motion.div
          className={`${height} ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={inView ? { width: `${clampedValue}%` } : { width: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0.3 : duration,
            ease: [0.4, 0, 0.2, 1],
            delay: 0.1
          }}
        />
      </div>
      {showValue && (
        <motion.span
          className="absolute right-0 top-0 -mt-6 text-xs font-medium text-muted-foreground"
          initial={{ opacity: 0, y: 5 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 5 }}
          transition={{ duration: 0.3, delay: duration * 0.5 }}
        >
          {clampedValue}%
        </motion.span>
      )}
    </div>
  )
}
