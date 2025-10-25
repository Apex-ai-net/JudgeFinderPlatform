'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DateRange {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  /** Current selected range */
  value?: DateRange
  /** Callback when range changes */
  onChange: (range: DateRange) => void
  /** Preset ranges to show */
  presets?: Array<{
    label: string
    days: number
  }>
  /** CSS class name */
  className?: string
}

const DEFAULT_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 12 months', days: 365 },
]

/**
 * DateRangePicker - Select date ranges with presets
 *
 * Provides quick preset options (7d, 30d, 90d, etc.) and custom date selection.
 * Designed for analytics dashboards and reporting interfaces.
 *
 * @example
 * ```tsx
 * const [range, setRange] = useState<DateRange>({
 *   from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
 *   to: new Date(),
 * })
 *
 * <DateRangePicker value={range} onChange={setRange} />
 * ```
 */
export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Calculate days between current range
  const daysDiff = value
    ? Math.ceil((value.to.getTime() - value.from.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Find matching preset
  const activePreset = presets.find((p) => p.days === daysDiff)

  const handlePresetClick = (days: number) => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)

    onChange({ from, to })
    setIsOpen(false)
  }

  const formatDateRange = (range?: DateRange) => {
    if (!range) return 'Select date range'

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    return `${formatDate(range.from)} - ${formatDate(range.to)}`
  }

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
          'bg-background border-border hover:bg-muted/50',
          'text-sm font-medium text-foreground',
          isOpen && 'ring-2 ring-primary/20'
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{activePreset?.label || formatDateRange(value)}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Content */}
          <div
            className={cn(
              'absolute top-full right-0 mt-2 z-50',
              'bg-card border border-border rounded-lg shadow-lg',
              'min-w-[200px] p-2'
            )}
          >
            <div className="space-y-1">
              {presets.map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => handlePresetClick(preset.days)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                    'hover:bg-muted/50',
                    preset.days === daysDiff
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-border" />

            {/* Custom Range (Future Enhancement) */}
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Custom range coming soon
            </div>
          </div>
        </>
      )}
    </div>
  )
}
