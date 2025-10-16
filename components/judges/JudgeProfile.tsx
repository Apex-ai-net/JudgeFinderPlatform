'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { GraduationCap, MapPin, TrendingUp, Clock, Scale, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import { BookmarkButton } from './BookmarkButton'
import { JudgeFilters } from './JudgeFilters'
import { JudgeHeader } from './JudgeHeader'
import { AnimatedCard, AnimatedNumber } from '@/components/micro-interactions'
import type { Judge } from '@/types'
import { useJudgeFilters } from '@/hooks/useJudgeFilters'

interface JudgeProfileProps {
  judge: Judge
}

function formatDataFreshness(updatedAt: string): string {
  if (!updatedAt) return 'Data freshness unavailable'
  const updated = new Date(updatedAt)
  if (Number.isNaN(updated.getTime())) return 'Data freshness unavailable'

  return `Updated ${updated.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
}

function buildEducationSummary(judge: Judge): string | null {
  const courtlistenerData = judge.courtlistener_data
  if (courtlistenerData && typeof courtlistenerData === 'object') {
    const educations = (courtlistenerData as any).educations
    if (Array.isArray(educations) && educations.length > 0) {
      const summary = educations
        .map((edu: any) => {
          const school = edu?.school?.name || edu?.school_name || ''
          const degree = edu?.degree || ''
          return [school, degree].filter(Boolean).join(' — ')
        })
        .filter(Boolean)[0]

      if (summary) return summary
    }
  }

  return judge.education
}

export function JudgeProfile({ judge }: JudgeProfileProps): JSX.Element {
  const courtlistenerData = judge.courtlistener_data

  let appointmentDate: Date | null = null
  let yearsOfService: number | null = null

  if (judge.appointed_date) {
    appointmentDate = new Date(judge.appointed_date)
  } else if (courtlistenerData && typeof courtlistenerData === 'object') {
    const positions = (courtlistenerData as any).positions
    if (Array.isArray(positions) && positions.length > 0) {
      const judicialPositions = positions
        .filter(
          (pos: any) =>
            pos?.position_type && ['jud', 'c-jud', 'jus', 'c-jus'].includes(pos.position_type)
        )
        .sort((a: any, b: any) => (a?.date_start || '').localeCompare(b?.date_start || ''))

      if (judicialPositions.length > 0 && judicialPositions[0]?.date_start) {
        appointmentDate = new Date(judicialPositions[0].date_start)
      }
    }
  }

  if (appointmentDate && !Number.isNaN(appointmentDate.getTime())) {
    const now = new Date()
    yearsOfService = Math.max(0, now.getFullYear() - appointmentDate.getFullYear())
  }

  const educationSummary = buildEducationSummary(judge)
  const dataFreshnessLabel = formatDataFreshness(judge.updated_at)

  const { filters, setFilters, resetFilters } = useJudgeFilters()

  const sectionLinks = useMemo(
    () => [
      { href: '#overview', label: 'Overview' },
      { href: '#coverage', label: 'Methodology' },
      { href: '#professional-background', label: 'Background' },
      { href: '#analytics', label: 'Analytics' },
      { href: '#recent-decisions', label: 'Recent decisions' },
    ],
    []
  )

  const metricTiles = [
    {
      label: 'Total rulings parsed',
      value: judge.total_cases > 0 ? judge.total_cases.toLocaleString() : '—',
      numericValue: judge.total_cases > 0 ? judge.total_cases : null,
      helper: 'Across all available case types',
      dataType: 'record' as const,
      icon: Scale,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Reversal rate',
      value: judge.reversal_rate > 0 ? `${(judge.reversal_rate * 100).toFixed(1)}%` : '—',
      numericValue: judge.reversal_rate > 0 ? judge.reversal_rate * 100 : null,
      helper: 'Share of reviewed decisions reversed on appeal',
      dataType: 'record' as const,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Average days to decision',
      value:
        judge.average_decision_time !== null && judge.average_decision_time > 0
          ? `${judge.average_decision_time}`
          : '—',
      numericValue:
        judge.average_decision_time !== null && judge.average_decision_time > 0
          ? judge.average_decision_time
          : null,
      helper: 'Median elapsed time from filing to decision',
      dataType: 'record' as const,
      icon: Clock,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Education highlight',
      value: educationSummary || 'Pending data enrichment',
      numericValue: null,
      helper: 'Sourced from CourtListener public records',
      dataType: 'record' as const,
      icon: Award,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ]

  return (
    <section className="space-y-6">
      <JudgeHeader
        judge={judge}
        appointmentYear={appointmentDate ? appointmentDate.getFullYear() : null}
        yearsOfService={yearsOfService}
        dataFreshnessLabel={dataFreshnessLabel}
      />

      <div className="sticky top-24 z-30 space-y-3 rounded-2xl border border-border/60 bg-[hsl(var(--bg-2))] px-5 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--bg-2))/0.85]">
        <nav className="flex flex-wrap items-center gap-2" aria-label="Judge analytics sections">
          {sectionLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center rounded-full border border-transparent bg-[hsl(var(--bg-1))] px-3 py-1.5 text-xs font-medium text-[color:hsl(var(--text-2))] transition-colors hover:border-[rgba(110,168,254,0.45)] hover:text-[color:hsl(var(--text-1))]"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <JudgeFilters value={filters} onChange={setFilters} onReset={resetFilters} />
          <BookmarkButton
            judgeId={judge.id}
            judgeName={judge.name}
            className="hidden md:inline-flex"
          />
        </div>
      </div>
      <div className="md:hidden">
        <BookmarkButton
          judgeId={judge.id}
          judgeName={judge.name}
          className="mt-1 w-full justify-center"
        />
      </div>

      <div id="overview" className="grid gap-4 scroll-mt-32 md:grid-cols-2 xl:grid-cols-4">
        {metricTiles.map((tile, index) => {
          const dataBadge = tile.dataType === 'record' ? 'Court record' : 'AI estimate'
          const longValue = typeof tile.value === 'string' && tile.value.length > 18
          const valueClass = longValue
            ? 'mt-3 text-lg font-semibold text-[color:hsl(var(--text-1))] leading-relaxed break-words'
            : 'mt-3 text-3xl font-semibold leading-none text-[color:hsl(var(--text-1))] break-words'
          const Icon = tile.icon

          return (
            <motion.div
              key={tile.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <AnimatedCard
                intensity="subtle"
                className="relative overflow-hidden p-5 shadow-card hover:shadow-card-hover"
              >
                {/* Icon badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs uppercase tracking-[0.24em] text-[color:hsl(var(--text-3))]">
                    {tile.label}
                  </div>
                  <motion.div
                    className={`p-2 rounded-lg ${tile.bgColor}`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Icon className={`h-4 w-4 ${tile.color}`} />
                  </motion.div>
                </div>

                {/* Value with animation */}
                <div className={valueClass}>
                  {tile.numericValue !== null ? (
                    <AnimatedNumber
                      value={tile.numericValue}
                      decimals={tile.numericValue > 100 ? 0 : 1}
                    />
                  ) : (
                    tile.value
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-[38px] w-full rounded-full bg-[rgba(124,135,152,0.14)] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${tile.bgColor.replace('/10', '/30')} transition-all duration-500`}
                    initial={{ width: '0%' }}
                    whileInView={{ width: '50%' }}
                    whileHover={{ width: '62%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                  />
                </div>

                {/* Badge */}
                <div className="mt-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:hsl(var(--text-3))]">
                  <span className="rounded-full border border-border/60 bg-[hsl(var(--bg-1))] px-2 py-1 text-[color:hsl(var(--text-2))]">
                    {dataBadge}
                  </span>
                </div>

                {/* Helper text */}
                <p className="mt-3 text-xs text-[color:hsl(var(--text-3))] leading-relaxed">
                  {tile.helper}
                </p>
              </AnimatedCard>
            </motion.div>
          )
        })}
      </div>

      <aside
        id="coverage"
        className="scroll-mt-32 rounded-2xl border border-border/60 bg-[hsl(var(--bg-2))] p-5 text-sm text-[color:hsl(var(--text-2))]"
      >
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-[color:hsl(var(--text-3))]">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Coverage and methodology
        </div>
        <p className="mt-3 leading-6 text-[color:hsl(var(--text-2))]">
          Analytics include rulings captured from CourtListener, state registers, and verified
          public sources. Data coverage expands nightly with automated syncs; key slices (motions,
          appeals, parties) are staged below for deeper review.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[color:hsl(var(--text-3))]">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-[hsl(var(--bg-1))] px-3 py-1 font-semibold uppercase tracking-[0.2em]">
            Court record
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-[hsl(var(--bg-1))] px-3 py-1 font-semibold uppercase tracking-[0.2em] text-[color:hsl(var(--accent))]">
            AI estimate
          </span>
          <Link
            href="/docs/methodology"
            className="inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1.5 font-medium text-[color:hsl(var(--accent))] transition-colors hover:border-[rgba(110,168,254,0.5)] hover:text-[color:hsl(var(--text-1))]"
          >
            Methodology &amp; limitations
          </Link>
        </div>
        {educationSummary && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/50 bg-[hsl(var(--bg-1))] px-4 py-2 text-xs text-[color:hsl(var(--text-2))]">
            <GraduationCap className="h-4 w-4" aria-hidden />
            {educationSummary}
          </p>
        )}
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-[hsl(var(--bg-1))] px-4 py-2 text-xs font-semibold text-[color:hsl(var(--text-2))] transition-colors hover:border-[rgba(110,168,254,0.45)] hover:text-[color:hsl(var(--text-1))]"
          onClick={() => {
            document.dispatchEvent(new CustomEvent('open-report-profile-issue'))
          }}
        >
          Report data issue
        </button>
      </aside>
    </section>
  )
}
