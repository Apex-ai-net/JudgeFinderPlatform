'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations/presets'

interface StatBadge {
  label: string
  value: string
  icon?: LucideIcon
}

interface CourtStatsRowProps {
  stats: StatBadge[]
}

export function CourtStatsRow({ stats }: CourtStatsRowProps): JSX.Element {
  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-3 mb-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            variants={fadeInUp}
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 shadow-md hover:shadow-lg transition-shadow"
          >
            {Icon && <Icon className="h-4 w-4 text-primary-foreground" />}
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-primary-foreground">{stat.label}</span>
              <span className="text-xs text-primary-foreground/80">·</span>
              <span className="text-xs text-primary-foreground/90">{stat.value}</span>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
