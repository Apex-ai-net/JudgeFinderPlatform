'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedBadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  pulse?: boolean
  className?: string
}

export function AnimatedBadge({
  children,
  variant = 'default',
  pulse = false,
  className,
}: AnimatedBadgeProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const variantStyles = {
    default: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
    warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400',
    error: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  }

  if (prefersReducedMotion) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
          variantStyles[variant],
          className
        )}
      >
        {pulse && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        {children}
      </span>
    )
  }

  return (
    <motion.span
      className={cn(
        'relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 25,
      }}
      whileHover={{
        scale: 1.05,
        transition: { duration: 0.2 },
      }}
    >
      {pulse && (
        <>
          {/* Animated pulse dot */}
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-current"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Pulse ring */}
          <motion.span
            className="absolute left-2 h-1.5 w-1.5 rounded-full bg-current"
            animate={{
              scale: [1, 2, 2],
              opacity: [0.5, 0, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        </>
      )}
      {children}
    </motion.span>
  )
}
