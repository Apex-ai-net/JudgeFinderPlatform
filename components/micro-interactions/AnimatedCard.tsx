'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  intensity?: 'subtle' | 'medium' | 'strong'
  glowColor?: 'primary' | 'success' | 'warning' | 'none'
  disableAnimation?: boolean
  children: React.ReactNode
}

const glowColors = {
  primary: 'rgba(59, 130, 246, 0.5)',
  success: 'rgba(34, 197, 94, 0.5)',
  warning: 'rgba(234, 179, 8, 0.5)',
  none: 'transparent'
}

const intensityConfig = {
  subtle: { y: -2, scale: 1.01, shadow: 'md' },
  medium: { y: -4, scale: 1.02, shadow: 'lg' },
  strong: { y: -8, scale: 1.05, shadow: 'xl' }
}

export function AnimatedCard({
  intensity = 'medium',
  glowColor = 'primary',
  disableAnimation = false,
  className,
  children,
  ...props
}: AnimatedCardProps) {
  const config = intensityConfig[intensity]
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldReduceMotion(mediaQuery.matches)

    const handleChange = () => setShouldReduceMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Respect user's motion preference
  if (disableAnimation || shouldReduceMotion) {
    return (
      <div className={cn('rounded-lg border border-border bg-card', className)}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={cn('rounded-lg border border-border bg-card', className)}
      whileHover={{
        y: -config.y,
        scale: config.scale,
        boxShadow: `0 ${config.y * 2}px ${config.y * 4}px ${glowColors[glowColor]}`,
        borderColor: glowColor !== 'none' ? glowColors[glowColor] : undefined,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
