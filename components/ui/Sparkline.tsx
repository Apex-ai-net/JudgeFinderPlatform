'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  /** Array of numeric data points to visualize */
  data: number[]
  /** Color of the line (default: primary color) */
  color?: string
  /** Height in pixels (default: 40) */
  height?: number
  /** Width (default: 100%) */
  width?: string | number
  /** Stroke width (default: 2) */
  strokeWidth?: number
  /** Show smooth curves instead of straight lines (default: true) */
  smooth?: boolean
  /** CSS class name */
  className?: string
}

/**
 * Sparkline - Minimalist inline chart for showing trends
 *
 * Perfect for KPI cards, showing data trends without axes or labels.
 * Uses Recharts for rendering with minimal configuration.
 *
 * @example
 * ```tsx
 * <Sparkline data={[10, 20, 15, 30, 25, 40]} />
 * <Sparkline data={revenueData} color="#10b981" height={30} />
 * ```
 */
export function Sparkline({
  data,
  color = 'hsl(var(--primary))',
  height = 40,
  width = '100%',
  strokeWidth = 2,
  smooth = true,
  className = '',
}: SparklineProps) {
  // Convert array to chart-compatible format
  const chartData = data.map((value, index) => ({
    index,
    value,
  }))

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type={smooth ? 'monotone' : 'linear'}
            dataKey="value"
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
