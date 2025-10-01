'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  loading?: boolean
  intensity?: 'subtle' | 'medium' | 'strong'
}

export function AnimatedInput({
  icon,
  loading,
  intensity = 'medium',
  className,
  ...props
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false)
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

  if (prefersReducedMotion) {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={cn(
            'w-full border border-input bg-background text-foreground rounded-lg transition-colors',
            icon ? 'pl-10 pr-4' : 'px-4',
            'py-3',
            'focus:ring-2 focus:ring-primary focus:border-transparent',
            className
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    )
  }

  const focusScale = {
    subtle: 1.01,
    medium: 1.02,
    strong: 1.03,
  }[intensity]

  const glowIntensity = {
    subtle: 'rgba(var(--primary-rgb), 0.1)',
    medium: 'rgba(var(--primary-rgb), 0.15)',
    strong: 'rgba(var(--primary-rgb), 0.2)',
  }[intensity]

  return (
    <motion.div
      className="relative"
      initial={{ scale: 1 }}
      animate={{
        scale: isFocused ? focusScale : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
    >
      {/* Animated glow effect */}
      <motion.div
        className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFocused ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Icon */}
      {icon && (
        <motion.div
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
          animate={{
            color: isFocused ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            scale: isFocused ? 1.1 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
      )}

      {/* Input */}
      <input
        {...props}
        className={cn(
          'relative z-10 w-full border border-input bg-background text-foreground rounded-lg transition-all duration-200',
          icon ? 'pl-10 pr-4' : 'px-4',
          'py-3',
          'focus:ring-2 focus:ring-primary focus:border-transparent',
          'hover:border-primary/50',
          'placeholder:text-muted-foreground/70',
          className
        )}
        onFocus={(e) => {
          setIsFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          props.onBlur?.(e)
        }}
      />

      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </motion.div>
      )}
    </motion.div>
  )
}
