'use client'

import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowRight,
  Calendar,
  Gavel,
  Scale,
  FileText,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { SharedTransitionLink } from '@/components/ui/SharedTransitionLink'
import { generateSlug } from '@/lib/utils/slug'
import { cardHover, transitions } from '@/lib/animations/presets'
import type { JudgeWithDecisions } from '@/lib/judges/directory/types'
import { AnimatedBadge } from '@/components/micro-interactions'

interface JudgesDirectoryGridCardProps {
  judge?: JudgeWithDecisions
  recentYears: number
  onCompareToggle?: (judgeId: string, selected: boolean) => void
  isSelected?: boolean
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth,
  },
}

export function JudgesDirectoryGridCard({
  judge,
  recentYears,
  onCompareToggle,
  isSelected = false,
}: JudgesDirectoryGridCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false)

  if (!judge) {
    return null
  }

  const summary = judge.decision_summary
  const currentYear = new Date().getFullYear()
  const recentWindowStart = currentYear - (recentYears - 1)
  const hasRecentDecisions = summary?.total_recent && summary.total_recent > 0
  const decisionCount = summary?.total_recent || 0

  // Calculate years of service
  const yearsOfService = judge.appointed_date
    ? currentYear - new Date(judge.appointed_date).getFullYear()
    : null

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onCompareToggle?.(judge.id, !isSelected)
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="h-full"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <SharedTransitionLink
        href={`/judges/${generateSlug(judge.name)}`}
        className="block h-full group"
        viewTransitionName={`judge-title-${judge.id}`}
      >
        <motion.div
          className="relative h-full rounded-xl border border-border bg-card overflow-hidden"
          variants={cardHover}
          initial="initial"
          whileHover="hover"
        >
          {/* Gradient overlay on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Selection checkbox */}
          {onCompareToggle && (
            <motion.button
              onClick={handleCompareClick}
              className={`absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                  : 'bg-muted/80 backdrop-blur-sm text-muted-foreground hover:bg-primary/20 hover:text-primary'
              }`}
              whileHover={{ scale: isSelected ? 1.15 : 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label={isSelected ? 'Remove from comparison' : 'Add to comparison'}
            >
              <CheckCircle2
                className={`w-4 h-4 transition-all ${isSelected ? 'fill-current' : ''}`}
              />
            </motion.button>
          )}

          <div className="relative z-10 p-6 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <motion.div
                className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <Gavel className="h-6 w-6 text-primary" />
              </motion.div>

              <div className="flex flex-col items-end gap-1.5">
                <AnimatedBadge variant="info" className="capitalize">
                  {judge.jurisdiction || 'CA'}
                </AnimatedBadge>
                {hasRecentDecisions && (
                  <AnimatedBadge variant="success" pulse>
                    <TrendingUp className="w-3 h-3" />
                    Active
                  </AnimatedBadge>
                )}
              </div>
            </div>

            {/* Name */}
            <h3
              className={`text-lg font-bold text-foreground mb-2 line-clamp-3 min-h-[3.5rem] group-hover:text-primary transition-colors ${onCompareToggle ? 'pr-10' : ''}`}
            >
              {judge.name}
            </h3>

            {/* Court */}
            <div className="flex items-start gap-2 mb-4">
              <Scale className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground line-clamp-2">
                {judge.court_name || 'Court not specified'}
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>Decisions</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {decisionCount > 0 ? decisionCount : '—'}
                </p>
                {decisionCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {recentWindowStart}-{currentYear}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Experience</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {yearsOfService ? `${yearsOfService}y` : '—'}
                </p>
                {yearsOfService && (
                  <p className="text-xs text-muted-foreground">
                    Since {currentYear - yearsOfService}
                  </p>
                )}
              </div>
            </div>

            {/* CTA */}
            <motion.div
              className="pt-4 flex items-center text-primary font-semibold text-sm"
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <span>View full profile</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </motion.div>
          </div>
        </motion.div>
      </SharedTransitionLink>
    </motion.div>
  )
}
