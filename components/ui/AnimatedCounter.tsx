'use client'

import { useState, useEffect, useRef } from 'react'

interface AnimatedCounterProps {
  /** The target value to animate to */
  end: number
  /** Duration of animation in milliseconds (default: 2000) */
  duration?: number
  /** Number of decimal places (default: 0) */
  decimals?: number
  /** Prefix to display (e.g., "$") */
  prefix?: string
  /** Suffix to display (e.g., "%") */
  suffix?: string
  /** Custom formatter function */
  formatter?: (value: number) => string
  /** CSS class name */
  className?: string
}

/**
 * AnimatedCounter - Smoothly animates a number from 0 to target value
 *
 * Uses requestAnimationFrame with easeOutCubic for smooth 60fps animation.
 * Supports decimals, prefixes, suffixes, and custom formatters.
 *
 * @example
 * ```tsx
 * <AnimatedCounter end={1234} prefix="$" decimals={2} />
 * // Output: $1,234.00
 *
 * <AnimatedCounter end={95.5} suffix="%" decimals={1} />
 * // Output: 95.5%
 * ```
 */
export function AnimatedCounter({
  end,
  duration = 2000,
  decimals = 0,
  prefix = '',
  suffix = '',
  formatter,
  className = '',
}: AnimatedCounterProps): JSX.Element {
  // Start with the final value to prevent hydration mismatch
  const [count, setCount] = useState(end)
  const [mounted, setMounted] = useState(false)
  const frameRef = useRef<number>()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only animate after mount to avoid hydration issues
    if (!mounted) return

    // Reset to 0 and start animation
    setCount(0)

    let startTime: number | null = null

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)

      // Easing function: easeOutCubic for smooth deceleration
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
      const easedProgress = easeOutCubic(progress)

      const currentValue = easedProgress * end
      setCount(currentValue)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
      }
    }

    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [end, duration, mounted])

  // Format the display value
  const formattedValue = formatter
    ? formatter(count)
    : count.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })

  // Use suppressHydrationWarning since we know the value will change after mount
  return (
    <span suppressHydrationWarning className={className}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  )
}
