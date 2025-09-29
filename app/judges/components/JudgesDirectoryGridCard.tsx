'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Calendar, Gavel, Scale } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import { SharedTransitionLink } from '@/components/ui/SharedTransitionLink'
import { generateSlug } from '@/lib/utils/slug'
import type { JudgeWithDecisions } from '@/lib/judges/directory/types'

interface JudgesDirectoryGridCardProps {
  judge?: JudgeWithDecisions
  recentYears: number
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
}

export function JudgesDirectoryGridCard({ judge, recentYears }: JudgesDirectoryGridCardProps) {
  if (!judge) {
    return null
  }

  const summary = judge.decision_summary
  const currentYear = new Date().getFullYear()
  const recentWindowStart = currentYear - (recentYears - 1)
  const decisionsLabel = summary?.total_recent
    ? `Recent decisions (${recentWindowStart}-${currentYear}) • ${summary.total_recent}`
    : 'No recent decisions'

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" className="h-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <SharedTransitionLink
        href={`/judges/${generateSlug(judge.name)}`}
        className="block h-full group relative overflow-hidden"
        viewTransitionName={`judge-title-${judge.id}`}
      >
        <GlassCard className="h-full p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-800/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between mb-4">
              <Gavel className="h-8 w-8 text-primary group-hover:text-primary/80 transition-colors" />
              <span className="text-sm font-medium text-white bg-gradient-to-r from-enterprise-primary to-enterprise-deep px-3 py-1 rounded-full capitalize">
                {judge.jurisdiction || 'Jurisdiction'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {judge.name}
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground flex-1">
              <div className="flex items-center">
                <Scale className="h-4 w-4 mr-2 text-muted-foreground/70 flex-shrink-0" />
                <span className="truncate">{judge.court_name || 'Court not specified'}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground/70" />
                <span className="text-xs">{decisionsLabel}</span>
              </div>
            </div>
            <motion.div className="pt-3 flex items-center text-primary font-medium" whileHover={{ x: 5 }}>
              <span className="text-sm">View profile</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </motion.div>
          </div>
        </GlassCard>
      </SharedTransitionLink>
    </motion.div>
  )
}

