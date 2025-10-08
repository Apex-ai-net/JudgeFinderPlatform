'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

interface InfoTooltipProps {
  content: ReactNode
  label?: string
  className?: string
  children?: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  learnMoreUrl?: string
  learnMoreText?: string
}

export function InfoTooltip({
  content,
  label = 'More information',
  className,
  children,
  position = 'top',
  learnMoreUrl,
  learnMoreText = 'Learn more',
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const show = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setOpen(true)
  }

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => setOpen(false), 80)
  }

  const positionClasses = (() => {
    switch (position) {
      case 'bottom':
        return 'left-1/2 top-full mt-2 -translate-x-1/2'
      case 'left':
        return 'right-full top-1/2 mr-2 -translate-y-1/2'
      case 'right':
        return 'left-full top-1/2 ml-2 -translate-y-1/2'
      case 'top':
      default:
        return 'left-1/2 bottom-full mb-2 -translate-x-1/2'
    }
  })()

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          'inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-[hsl(var(--bg-1))] text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          !children && 'text-[color:hsl(var(--text-3))]',
        )}
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen((current) => !current)
          }
        }}
      >
        {children ?? <span aria-hidden>?</span>}
      </button>
      {open && (
        <div
          role="tooltip"
          id={tooltipId}
          className={cn(
            'absolute z-50 w-64 max-w-xs rounded-lg border border-border bg-card p-3 text-start text-xs text-muted-foreground shadow-lg',
            learnMoreUrl ? 'pointer-events-auto' : 'pointer-events-none',
            positionClasses,
          )}
        >
          <div className="space-y-2">
            {content}
            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                {learnMoreText}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
