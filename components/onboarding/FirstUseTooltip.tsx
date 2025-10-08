'use client'

import { useEffect, useState } from 'react'
import { X, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FirstUseTooltipProps {
  id: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  children?: React.ReactNode
  showDontShowAgain?: boolean
}

const TOOLTIP_STORAGE_KEY = 'judgefinder_tooltips_dismissed'

/**
 * First-use tooltip that appears once to guide users through new features
 * Dismissible with optional "Don't show again" checkbox
 */
export function FirstUseTooltip({
  id,
  title,
  description,
  position = 'bottom',
  className,
  children,
  showDontShowAgain = true,
}: FirstUseTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    // Check if tooltip has been dismissed
    const dismissedTooltips = getDismissedTooltips()
    if (!dismissedTooltips.includes(id)) {
      // Delay showing tooltip to avoid overwhelming user
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [id])

  const handleDismiss = () => {
    setIsVisible(false)

    if (dontShowAgain) {
      const dismissedTooltips = getDismissedTooltips()
      dismissedTooltips.push(id)
      saveDismissedTooltips(dismissedTooltips)
    }

    // Track dismissal
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-ignore
      window.gtag('event', 'tooltip_dismissed', {
        tooltip_id: id,
        dont_show_again: dontShowAgain,
      })
    }
  }

  const handleGotIt = () => {
    handleDismiss()

    // Track engagement
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-ignore
      window.gtag('event', 'tooltip_completed', {
        tooltip_id: id,
      })
    }
  }

  if (!isVisible) {
    return <>{children}</>
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-card',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-card',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-card',
    right:
      'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-card',
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {children}
      <div
        className={cn(
          'absolute z-[9999] w-80 max-w-sm rounded-lg border border-primary/50 bg-card shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300',
          positionClasses[position]
        )}
        role="tooltip"
      >
        {/* Arrow */}
        <div
          className={cn(
            'absolute w-0 h-0 border-[8px]',
            arrowClasses[position]
          )}
        />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss tooltip"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 pr-6">
            <h4 className="font-semibold text-foreground mb-1">{title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 ml-14">
          {showDontShowAgain && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">
                Don't show this again
              </span>
            </label>
          )}
          <button
            onClick={handleGotIt}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Get list of dismissed tooltips from localStorage
 */
function getDismissedTooltips(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(TOOLTIP_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading dismissed tooltips:', error)
    return []
  }
}

/**
 * Save dismissed tooltips to localStorage
 */
function saveDismissedTooltips(tooltips: string[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(TOOLTIP_STORAGE_KEY, JSON.stringify(tooltips))
  } catch (error) {
    console.error('Error saving dismissed tooltips:', error)
  }
}

/**
 * Reset all tooltips (for testing)
 */
export function resetTooltips(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOOLTIP_STORAGE_KEY)
}

/**
 * Check if a specific tooltip has been dismissed
 */
export function isTooltipDismissed(id: string): boolean {
  const dismissed = getDismissedTooltips()
  return dismissed.includes(id)
}
