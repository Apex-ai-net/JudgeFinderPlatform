'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Vote, UserCheck, Scale, Award, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SelectionMethod, type ElectionBadgeProps } from '@/types/elections'

/**
 * Selection Method Badge Configuration
 *
 * Defines visual styling and metadata for each judicial selection method.
 * Each entry includes:
 * - label: Display text for the badge
 * - icon: Lucide icon component
 * - description: Detailed explanation shown in tooltip
 * - badgeClass: Tailwind classes for badge styling
 * - iconClass: Tailwind classes for icon styling
 *
 * IMPORTANT: Must include all values from the database ENUM `selection_method`
 */
const SELECTION_METHOD_CONFIG = {
  [SelectionMethod.ELECTED]: {
    label: 'Elected',
    icon: Vote,
    description: 'This judge was elected by voters in a competitive election.',
    badgeClass: 'bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  [SelectionMethod.APPOINTED]: {
    label: 'Appointed',
    icon: UserCheck,
    description: 'This judge was appointed to the bench by an executive authority (e.g., Governor or President).',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  [SelectionMethod.RETENTION]: {
    label: 'Retention',
    icon: Scale,
    description: 'This judge faces periodic retention votes where voters decide whether to keep them in office.',
    badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  [SelectionMethod.MERIT_SELECTION]: {
    label: 'Merit Selection',
    icon: Award,
    description: 'This judge was selected through a merit-based process (Missouri Plan) involving a nominating commission.',
    badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400',
    iconClass: 'text-purple-600 dark:text-purple-400',
  },
  [SelectionMethod.LEGISLATIVE]: {
    label: 'Legislative',
    icon: UserCheck,
    description: 'This judge was appointed by the state legislature.',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30 dark:text-indigo-400',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  [SelectionMethod.MIXED]: {
    label: 'Mixed Method',
    icon: Scale,
    description: 'This judge was selected through a combination of methods (e.g., appointed then retention).',
    badgeClass: 'bg-teal-500/10 text-teal-600 border-teal-500/30 dark:text-teal-400',
    iconClass: 'text-teal-600 dark:text-teal-400',
  },
  [SelectionMethod.UNKNOWN]: {
    label: 'Selection Method Not Specified',
    icon: Award,
    description: 'The method by which this judge was selected has not been determined.',
    badgeClass: 'bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400',
    iconClass: 'text-gray-600 dark:text-gray-400',
  },
} as const

/**
 * Format election date for display
 *
 * @param dateString - ISO date string (e.g., "2026-11-03")
 * @returns Formatted date string (e.g., "Nov 2026")
 */
function formatElectionDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `${month} ${year}`
  } catch {
    return dateString
  }
}

/**
 * Calculate days until election
 *
 * @param dateString - ISO date string
 * @returns Number of days until election, or null if invalid
 */
function getDaysUntilElection(dateString: string): number | null {
  try {
    const electionDate = new Date(dateString)
    const today = new Date()
    const diffTime = electionDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : null
  } catch {
    return null
  }
}

/**
 * ElectionBadge Component
 *
 * A compact, accessible badge component that displays a judge's selection method
 * and upcoming election information. Supports multiple display variants and includes
 * hover tooltips with detailed explanations.
 *
 * @example Basic usage
 * ```tsx
 * <ElectionBadge
 *   selectionMethod={SelectionMethod.ELECTED}
 * />
 * ```
 *
 * @example With next election date
 * ```tsx
 * <ElectionBadge
 *   selectionMethod={SelectionMethod.RETENTION_ELECTION}
 *   nextElectionDate="2026-11-03"
 *   showCountdown
 * />
 * ```
 *
 * @example Compact mode for cards
 * ```tsx
 * <ElectionBadge
 *   selectionMethod={SelectionMethod.APPOINTED}
 *   variant="compact"
 * />
 * ```
 *
 * @param props - Component props
 * @returns Election badge component
 */
export function ElectionBadge({
  selectionMethod,
  nextElectionDate,
  isUpForElection = false,
  variant = 'detailed',
  showCountdown = false,
  className,
}: ElectionBadgeProps): JSX.Element {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Detect reduced motion preference
  useEffect(() => {
    setMounted(true)
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Get configuration for selection method (all database enum values are covered)
  const config = SELECTION_METHOD_CONFIG[selectionMethod]
  const Icon = config.icon
  const daysUntil = nextElectionDate ? getDaysUntilElection(nextElectionDate) : null
  const formattedDate = nextElectionDate ? formatElectionDate(nextElectionDate) : null

  // Build tooltip content
  const tooltipContent = (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{config.description}</p>
      {nextElectionDate && formattedDate && (
        <p className="text-xs font-medium text-foreground">
          Next Election: <span className="text-primary">{formattedDate}</span>
        </p>
      )}
      {daysUntil !== null && showCountdown && (
        <p className="text-xs text-muted-foreground">
          {daysUntil} {daysUntil === 1 ? 'day' : 'days'} remaining
        </p>
      )}
    </div>
  )

  // Minimal variant - icon only
  if (variant === 'minimal') {
    return (
      <span className={cn('inline-flex items-center', className)}>
        <InfoTooltip content={tooltipContent} label={`Selection method: ${config.label}`}>
          <span className={cn('inline-flex h-5 w-5 items-center justify-center', config.iconClass)}>
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{config.label}</span>
          </span>
        </InfoTooltip>
      </span>
    )
  }

  // Compact variant - no election date
  if (variant === 'compact') {
    const badge = (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
          config.badgeClass,
          className
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        <span>{config.label}</span>
      </span>
    )

    if (prefersReducedMotion || !mounted) {
      return (
        <span className="inline-flex items-center gap-1.5">
          {badge}
          <InfoTooltip content={tooltipContent} label={`${config.label} details`} />
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1.5">
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 25,
          }}
          whileHover={{
            scale: 1.05,
            transition: { duration: 0.2 },
          }}
        >
          {badge}
        </motion.span>
        <InfoTooltip content={tooltipContent} label={`${config.label} details`} />
      </span>
    )
  }

  // Detailed variant - includes election date if available
  const detailedBadge = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
          config.badgeClass
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        <span>{config.label}</span>
      </span>

      {nextElectionDate && formattedDate && (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
            isUpForElection
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400'
              : 'bg-muted/50 text-muted-foreground border-border'
          )}
        >
          <Calendar className="h-3 w-3" aria-hidden />
          <span>
            {isUpForElection ? 'Up for Election: ' : 'Next Election: '}
            {formattedDate}
          </span>
          {isUpForElection && (
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-amber-500"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              aria-hidden
            />
          )}
        </span>
      )}

      <InfoTooltip content={tooltipContent} label={`${config.label} election details`} />
    </span>
  )

  if (prefersReducedMotion || !mounted) {
    return detailedBadge
  }

  return (
    <motion.span
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 20,
      }}
    >
      {detailedBadge}
    </motion.span>
  )
}

/**
 * ElectionStatusBadge Component
 *
 * A simplified wrapper around ElectionBadge that determines the appropriate
 * configuration based on selection method and automatically detects if a
 * judge is currently up for election.
 *
 * @example
 * ```tsx
 * <ElectionStatusBadge
 *   selectionMethod={SelectionMethod.RETENTION_ELECTION}
 *   nextElectionDate="2026-11-03"
 * />
 * ```
 *
 * @param props - Component props
 * @returns Election status badge
 */
export function ElectionStatusBadge({
  selectionMethod,
  nextElectionDate,
  variant = 'compact',
  className,
}: Omit<ElectionBadgeProps, 'isUpForElection' | 'showCountdown'>): JSX.Element {
  // Auto-detect if election is within 180 days
  const daysUntil = nextElectionDate ? getDaysUntilElection(nextElectionDate) : null
  const isUpForElection = daysUntil !== null && daysUntil <= 180

  return (
    <ElectionBadge
      selectionMethod={selectionMethod}
      nextElectionDate={nextElectionDate}
      isUpForElection={isUpForElection}
      variant={variant}
      showCountdown={isUpForElection}
      className={className}
    />
  )
}
