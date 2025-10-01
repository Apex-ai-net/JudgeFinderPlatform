'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ProgressRingProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  showValue?: boolean
  duration?: number
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = 'hsl(var(--primary))',
  label,
  showValue = true,
  duration = 1.5,
}: ProgressRingProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  if (!mounted) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center"
      >
        <div className="text-center">
          {showValue && (
            <div className="text-2xl font-bold text-foreground">{value}%</div>
          )}
          {label && (
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.2}
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={prefersReducedMotion ? offset : circumference}
          strokeLinecap="round"
          animate={{
            strokeDashoffset: offset,
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : duration,
            ease: 'easeOut',
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {showValue && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: prefersReducedMotion ? 0 : duration * 0.5 }}
              className="text-2xl font-bold text-foreground"
            >
              {value}%
            </motion.div>
          )}
          {label && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: prefersReducedMotion ? 0 : duration * 0.7 }}
              className="text-xs text-muted-foreground mt-1"
            >
              {label}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
