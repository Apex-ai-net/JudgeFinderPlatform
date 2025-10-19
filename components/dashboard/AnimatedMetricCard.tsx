'use client'

import { ReactNode, useEffect, useState } from 'react'
import { LucideIcon } from 'lucide-react'

interface AnimatedMetricCardProps {
  title: string
  value: number
  description: string
  icon: LucideIcon
  iconColor: string
  iconBgColor: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function AnimatedMetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend,
}: AnimatedMetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0)

  // Animated counter effect
  useEffect(() => {
    let startTime: number | null = null
    const duration = 1000 // 1 second animation

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setDisplayValue(Math.floor(easeOutQuart * value))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value])

  return (
    <div className="bg-card rounded-xl border border-border reshade-depth group p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold text-foreground tabular-nums">{displayValue}</p>
            {trend && (
              <span
                className={`text-xs font-medium ${
                  trend.isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        </div>
        <div
          className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center transition-transform group-hover:scale-110`}
        >
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">{description}</p>
    </div>
  )
}
