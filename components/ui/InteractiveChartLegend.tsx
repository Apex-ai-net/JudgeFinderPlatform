'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface LegendItem {
  /** Unique key for the data series */
  dataKey: string
  /** Display name for the legend */
  name: string
  /** Color of the series */
  color: string
}

interface InteractiveChartLegendProps {
  /** Array of legend items */
  items: LegendItem[]
  /** Callback when legend item is toggled */
  onToggle: (dataKey: string, visible: boolean) => void
  /** Initially visible data keys (default: all visible) */
  initialVisible?: string[]
  /** Layout direction (default: horizontal) */
  layout?: 'horizontal' | 'vertical'
  /** CSS class name */
  className?: string
}

/**
 * InteractiveChartLegend - Clickable legend that shows/hides chart series
 *
 * Provides a professional legend interface where users can click items
 * to toggle visibility of data series in charts.
 *
 * @example
 * ```tsx
 * const [hiddenSeries, setHiddenSeries] = useState<string[]>([])
 *
 * <InteractiveChartLegend
 *   items={[
 *     { dataKey: 'impressions', name: 'Impressions', color: '#3b82f6' },
 *     { dataKey: 'clicks', name: 'Clicks', color: '#10b981' },
 *   ]}
 *   onToggle={(key, visible) => {
 *     setHiddenSeries(prev =>
 *       visible ? prev.filter(k => k !== key) : [...prev, key]
 *     )
 *   }}
 * />
 * ```
 */
export function InteractiveChartLegend({
  items,
  onToggle,
  initialVisible,
  layout = 'horizontal',
  className = '',
}: InteractiveChartLegendProps) {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(
    new Set(initialVisible || items.map((item) => item.dataKey))
  )

  const handleToggle = (dataKey: string) => {
    const newVisible = new Set(visibleItems)
    const willBeVisible = !visibleItems.has(dataKey)

    if (willBeVisible) {
      newVisible.add(dataKey)
    } else {
      newVisible.delete(dataKey)
    }

    setVisibleItems(newVisible)
    onToggle(dataKey, willBeVisible)
  }

  return (
    <div
      className={cn(
        'flex gap-4 text-sm',
        layout === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
    >
      {items.map((item) => {
        const isVisible = visibleItems.has(item.dataKey)

        return (
          <button
            key={item.dataKey}
            onClick={() => handleToggle(item.dataKey)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md transition-all',
              'hover:bg-muted/50 cursor-pointer select-none',
              isVisible ? 'opacity-100' : 'opacity-40'
            )}
            aria-label={`Toggle ${item.name} visibility`}
            aria-pressed={isVisible}
          >
            {/* Color indicator */}
            <div
              className={cn(
                'w-3 h-3 rounded-sm transition-all',
                isVisible ? 'scale-100' : 'scale-75'
              )}
              style={{ backgroundColor: item.color }}
            />

            {/* Series name */}
            <span
              className={cn(
                'font-medium transition-all',
                isVisible ? 'text-foreground' : 'text-muted-foreground line-through'
              )}
            >
              {item.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
