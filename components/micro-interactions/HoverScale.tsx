'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { useEffect, useState } from 'react'

interface HoverScaleProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  scale?: number
  children: React.ReactNode
  className?: string
}

export function HoverScale({
  scale = 1.05,
  children,
  className,
  ...props
}: HoverScaleProps) {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldReduceMotion(mediaQuery.matches)

    const handleChange = () => setShouldReduceMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
