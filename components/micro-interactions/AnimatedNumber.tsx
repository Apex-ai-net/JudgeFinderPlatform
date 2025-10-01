'use client'

import { useEffect, useState, useRef } from 'react'
import { useInView } from 'react-intersection-observer'

interface AnimatedNumberProps {
  value: number
  duration?: number
  decimals?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedNumber({
  value,
  duration = 2000,
  decimals = 0,
  className,
  prefix = '',
  suffix = ''
}: AnimatedNumberProps) {
  const [count, setCount] = useState(0)
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldReduceMotion(mediaQuery.matches)

    const handleChange = () => setShouldReduceMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!inView || hasAnimated.current) return

    // Respect reduced motion - show final value immediately
    if (shouldReduceMotion) {
      setCount(value)
      hasAnimated.current = true
      return
    }

    hasAnimated.current = true
    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentCount = startValue + (value - startValue) * easeOutQuart

      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [inView, value, duration, shouldReduceMotion])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  )
}
