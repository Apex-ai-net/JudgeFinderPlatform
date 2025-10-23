'use client'

import { useMemo, useState } from 'react'
import {
  Vote,
  Calendar,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Award,
  Users,
  AlertCircle,
  BookOpen,
  MapPin
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedCard } from '@/components/micro-interactions'
import { formatRelativeTime } from '@/lib/utils/date-formatters'
import {
  ElectionResult,
  ElectionType,
  SelectionMethod,
  PoliticalParty,
  type ElectionInformationProps,
  type JudgeElection,
} from '@/types/elections'

/**
 * ElectionInformation Component
 *
 * Displays comprehensive judicial election and political affiliation data on judge profile pages.
 *
 * Features:
 * - Current term information with years remaining calculation
 * - Election history timeline with past elections
 * - Political affiliation history with party changes
 * - Voter resources section with links
 * - Educational content about California retention elections
 * - Responsive design for mobile and desktop
 * - Graceful handling of missing data
 *
 * @example
 * ```tsx
 * <ElectionInformation
 *   judgeId="judge-123"
 *   selectionMethod={SelectionMethod.ELECTED}
 *   currentTermEndDate="2028-12-31"
 *   nextElectionDate="2028-11-05"
 *   electionHistory={elections}
 *   showFullHistory={true}
 *   showPoliticalAffiliation={true}
 *   currentAffiliation={PoliticalParty.DEMOCRATIC}
 * />
 * ```
 */
export function ElectionInformation({
  judgeId,
  selectionMethod,
  currentTermEndDate,
  nextElectionDate,
  electionHistory = [],
  showFullHistory = false,
  showPoliticalAffiliation = false,
  currentAffiliation,
  className,
  onElectionClick,
}: ElectionInformationProps): JSX.Element {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(showFullHistory)
  const [showEducationalContent, setShowEducationalContent] = useState(false)

  // Calculate years remaining in current term
  const yearsRemaining = useMemo(() => {
    if (!currentTermEndDate) return null
    const endDate = new Date(currentTermEndDate)
    const now = new Date()
    const diffYears = endDate.getFullYear() - now.getFullYear()
    const diffMonths = endDate.getMonth() - now.getMonth()

    // Calculate precise years remaining (with decimals)
    const years = diffYears + (diffMonths / 12)
    return Math.max(0, years)
  }, [currentTermEndDate])

  // Calculate days until next election
  const daysUntilElection = useMemo(() => {
    if (!nextElectionDate) return null
    const electionDate = new Date(nextElectionDate)
    const now = new Date()
    const diffTime = electionDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }, [nextElectionDate])

  // Sort election history by date (most recent first)
  const sortedElections = useMemo(() => {
    return [...electionHistory].sort((a, b) =>
      new Date(b.election_date).getTime() - new Date(a.election_date).getTime()
    )
  }, [electionHistory])

  // Show limited elections if not expanded
  const displayedElections = isHistoryExpanded
    ? sortedElections
    : sortedElections.slice(0, 3)

  // Check if there's any election data
  const hasElectionData =
    currentTermEndDate ||
    nextElectionDate ||
    electionHistory.length > 0 ||
    showPoliticalAffiliation

  // If no data available, show empty state
  if (!hasElectionData) {
    return (
      <section
        className="overflow-hidden rounded-2xl border border-border bg-[hsl(var(--bg-2))] shadow-md"
        aria-label="Election information"
      >
        <header className="flex items-center gap-2 border-b border-border/60 bg-[hsl(var(--bg-1))] px-6 py-4">
          <Vote className="h-5 w-5 text-[color:hsl(var(--accent))]" aria-hidden />
          <h2 className="text-lg font-semibold text-[color:hsl(var(--text-1))]">
            Election information
          </h2>
        </header>
        <div className="px-6 py-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[color:hsl(var(--text-3))]" aria-hidden />
          <p className="mt-4 text-sm text-[color:hsl(var(--text-2))]">
            No election data available for this judge.
          </p>
          <p className="mt-2 text-xs text-[color:hsl(var(--text-3))]">
            Election information may not be applicable for appointed positions or data is pending enrichment.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-[hsl(var(--bg-2))] shadow-md"
      aria-label="Election information"
    >
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-border/60 bg-[hsl(var(--bg-1))] px-6 py-4">
        <Vote className="h-5 w-5 text-[color:hsl(var(--accent))]" aria-hidden />
        <h2 className="text-lg font-semibold text-[color:hsl(var(--text-1))]">
          Election information
        </h2>
      </header>

      <div className="space-y-6 px-6 py-5">
        {/* Selection Method Badge */}
        <SelectionMethodBadge selectionMethod={selectionMethod} />

        {/* Current Term & Next Election */}
        {(currentTermEndDate || nextElectionDate) && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Current Term */}
            {currentTermEndDate && (
              <AnimatedCard intensity="subtle" className="p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-1 h-5 w-5 text-[color:hsl(var(--accent))]" aria-hidden />
                  <div className="min-w-0 space-y-1 flex-1">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:hsl(var(--text-3))]">
                      Current term
                    </h3>
                    <p className="text-base font-medium text-[color:hsl(var(--text-1))]">
                      {formatTermEndDate(currentTermEndDate)}
                    </p>
                    {yearsRemaining !== null && (
                      <p className="text-sm text-[color:hsl(var(--text-2))]">
                        {yearsRemaining < 1
                          ? 'Less than 1 year remaining'
                          : `${yearsRemaining.toFixed(1)} years remaining`
                        }
                      </p>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            )}

            {/* Next Election */}
            {nextElectionDate && (
              <AnimatedCard intensity="subtle" className="p-4">
                <div className="flex items-start gap-3">
                  <Vote className="mt-1 h-5 w-5 text-[color:hsl(var(--accent))]" aria-hidden />
                  <div className="min-w-0 space-y-1 flex-1">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:hsl(var(--text-3))]">
                      Next election
                    </h3>
                    <p className="text-base font-medium text-[color:hsl(var(--text-1))]">
                      {formatElectionDate(nextElectionDate)}
                    </p>
                    {daysUntilElection !== null && (
                      <p className="text-sm text-[color:hsl(var(--text-2))]">
                        {daysUntilElection === 0
                          ? 'Election day is today'
                          : daysUntilElection < 30
                            ? `${daysUntilElection} days away`
                            : `${Math.floor(daysUntilElection / 30)} months away`
                        }
                      </p>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            )}
          </div>
        )}

        {/* Political Affiliation */}
        {showPoliticalAffiliation && currentAffiliation && (
          <div className="rounded-xl border border-border/60 bg-[hsl(var(--bg-1))] p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[color:hsl(var(--accent))]" aria-hidden />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:hsl(var(--text-3))]">
                  Political affiliation
                </h3>
                <p className="mt-1 text-base font-medium text-[color:hsl(var(--text-1))]">
                  {formatPoliticalParty(currentAffiliation)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Election History Timeline */}
        {sortedElections.length > 0 && (
          <div>
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[color:hsl(var(--accent))]" aria-hidden />
                <h3 className="text-sm font-semibold text-[color:hsl(var(--text-1))]">
                  Election history
                </h3>
              </div>
              {sortedElections.length > 3 && (
                <button
                  type="button"
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[color:hsl(var(--accent))] transition-colors hover:text-[color:hsl(var(--text-1))]"
                  aria-expanded={isHistoryExpanded}
                  aria-controls="election-history-list"
                >
                  {isHistoryExpanded ? (
                    <>
                      Show less <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show all ({sortedElections.length}) <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </header>

            <AnimatePresence mode="sync">
              <motion.div
                id="election-history-list"
                className="space-y-3"
                initial={false}
              >
                {displayedElections.map((election, index) => (
                  <ElectionHistoryItem
                    key={election.id}
                    election={election}
                    index={index}
                    onClick={() => onElectionClick?.(election)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Voter Resources */}
        {nextElectionDate && (
          <div className="rounded-xl border border-border/60 bg-[hsl(var(--bg-1))] p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-[color:hsl(var(--accent))]" aria-hidden />
              <h3 className="text-sm font-semibold text-[color:hsl(var(--text-1))]">
                Voter resources
              </h3>
            </div>
            <div className="space-y-2">
              <VoterResourceLink
                href="https://www.sos.ca.gov/elections/upcoming-elections"
                label="California Voter Guide"
              />
              <VoterResourceLink
                href="https://www.sos.ca.gov/elections/voter-registration"
                label="Check registration status"
              />
              <VoterResourceLink
                href="https://www.courts.ca.gov/3014.htm"
                label="Learn about judicial elections"
              />
            </div>
          </div>
        )}

        {/* Educational Content Toggle */}
        <button
          type="button"
          onClick={() => setShowEducationalContent(!showEducationalContent)}
          className="w-full rounded-xl border border-border/60 bg-[hsl(var(--bg-1))] p-4 text-left transition-colors hover:border-[rgba(110,168,254,0.45)] hover:bg-[hsl(var(--bg-2))]"
          aria-expanded={showEducationalContent}
          aria-controls="educational-content"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[color:hsl(var(--accent))]" aria-hidden />
              <span className="text-sm font-semibold text-[color:hsl(var(--text-1))]">
                About California judicial elections
              </span>
            </div>
            {showEducationalContent ? (
              <ChevronUp className="h-5 w-5 text-[color:hsl(var(--text-3))]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[color:hsl(var(--text-3))]" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {showEducationalContent && (
            <motion.div
              id="educational-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <EducationalContent />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

/**
 * SelectionMethodBadge Component
 *
 * Displays a badge indicating how the judge was selected
 */
function SelectionMethodBadge({ selectionMethod }: { selectionMethod: SelectionMethod }): JSX.Element {
  const methodInfo = getSelectionMethodInfo(selectionMethod)

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-[hsl(var(--bg-1))] px-4 py-2">
      <Award className="h-4 w-4 text-[color:hsl(var(--accent))]" aria-hidden />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:hsl(var(--text-2))]">
        {methodInfo.label}
      </span>
    </div>
  )
}

/**
 * ElectionHistoryItem Component
 *
 * Displays a single election in the history timeline
 */
interface ElectionHistoryItemProps {
  election: JudgeElection
  index: number
  onClick?: () => void
}

function ElectionHistoryItem({ election, index, onClick }: ElectionHistoryItemProps): JSX.Element {
  const resultInfo = getElectionResultInfo(election.result)
  const typeLabel = getElectionTypeLabel(election.election_type)

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-xl border border-border/40 bg-[hsl(var(--bg-1))] p-4 transition-colors hover:border-[rgba(110,168,254,0.45)] hover:bg-[hsl(var(--bg-2))]"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Election Date & Type */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[color:hsl(var(--text-3))]" aria-hidden />
            <span className="text-sm font-medium text-[color:hsl(var(--text-1))]">
              {formatElectionDate(election.election_date)}
            </span>
            <span className="text-xs text-[color:hsl(var(--text-3))]">•</span>
            <span className="text-xs uppercase tracking-wider text-[color:hsl(var(--text-3))]">
              {typeLabel}
            </span>
          </div>

          {/* Position */}
          <p className="text-sm text-[color:hsl(var(--text-2))]">
            {election.position_sought}
          </p>

          {/* Vote Percentage */}
          {election.vote_percentage !== null && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-[rgba(124,135,152,0.14)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[color:hsl(var(--accent))]"
                    initial={{ width: 0 }}
                    animate={{ width: `${election.vote_percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </div>
              </div>
              <span className="text-xs font-medium text-[color:hsl(var(--text-2))]">
                {election.vote_percentage.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Total Votes */}
          {election.total_votes !== null && (
            <p className="text-xs text-[color:hsl(var(--text-3))]">
              {election.total_votes.toLocaleString()} votes
            </p>
          )}
        </div>

        {/* Result Badge */}
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 ${resultInfo.bgColor}`}>
          {resultInfo.icon}
          <span className={`text-xs font-semibold uppercase tracking-wider ${resultInfo.textColor}`}>
            {resultInfo.label}
          </span>
        </div>
      </div>

      {/* Incumbent Badge */}
      {election.is_incumbent && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border/60 bg-[hsl(var(--bg-2))] px-2 py-1">
          <Award className="h-3 w-3 text-[color:hsl(var(--accent))]" aria-hidden />
          <span className="text-xs font-medium text-[color:hsl(var(--text-3))]">
            Incumbent
          </span>
        </div>
      )}
    </motion.article>
  )
}

/**
 * VoterResourceLink Component
 *
 * Displays an external link to a voter resource
 */
interface VoterResourceLinkProps {
  href: string
  label: string
}

function VoterResourceLink({ href, label }: VoterResourceLinkProps): JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border/40 bg-[hsl(var(--bg-2))] px-3 py-2 text-sm text-[color:hsl(var(--text-2))] transition-colors hover:border-[rgba(110,168,254,0.45)] hover:text-[color:hsl(var(--text-1))]"
    >
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </a>
  )
}

/**
 * EducationalContent Component
 *
 * Displays educational information about California judicial elections
 */
function EducationalContent(): JSX.Element {
  return (
    <div className="rounded-xl border border-border/60 bg-[hsl(var(--bg-1))] p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-[color:hsl(var(--text-1))] mb-2">
          How California judicial elections work
        </h4>
        <p className="text-sm text-[color:hsl(var(--text-2))] leading-relaxed">
          California uses different methods for selecting judges depending on the court level.
          Superior Court judges are elected by voters in nonpartisan elections, while appellate
          and Supreme Court justices are appointed by the Governor and subject to retention elections.
        </p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-[color:hsl(var(--text-1))] mb-2">
          Retention elections
        </h4>
        <p className="text-sm text-[color:hsl(var(--text-2))] leading-relaxed">
          In retention elections, voters answer yes or no to whether a judge should remain in office.
          There are no opposing candidates. If a majority votes "no," the position becomes vacant and
          a new appointment is made.
        </p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-[color:hsl(var(--text-1))] mb-2">
          Nonpartisan elections
        </h4>
        <p className="text-sm text-[color:hsl(var(--text-2))] leading-relaxed">
          Superior Court judicial elections are nonpartisan, meaning candidates' political party
          affiliations are not listed on the ballot. This is designed to promote judicial independence
          and impartiality.
        </p>
      </div>

      <div className="pt-4 border-t border-border/60">
        <a
          href="https://www.courts.ca.gov/3014.htm"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-[color:hsl(var(--accent))] transition-colors hover:text-[color:hsl(var(--text-1))]"
        >
          Learn more about California judicial elections
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format term end date in a human-readable format
 */
function formatTermEndDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format election date in a human-readable format
 */
function formatElectionDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Get display information for selection method
 */
function getSelectionMethodInfo(method: SelectionMethod): { label: string; description: string } {
  const info: Record<SelectionMethod, { label: string; description: string }> = {
    [SelectionMethod.APPOINTED]: {
      label: 'Appointed',
      description: 'Appointed by executive (governor, president)',
    },
    [SelectionMethod.ELECTED]: {
      label: 'Elected',
      description: 'Won a competitive election',
    },
    [SelectionMethod.MERIT_SELECTION]: {
      label: 'Merit selection',
      description: 'Appointed from nominating commission',
    },
    [SelectionMethod.LEGISLATIVE_APPOINTMENT]: {
      label: 'Legislative appointment',
      description: 'Appointed by legislature',
    },
    [SelectionMethod.RETENTION_ELECTION]: {
      label: 'Retention election',
      description: 'Retained through yes/no vote',
    },
    [SelectionMethod.COMMISSION_APPOINTMENT]: {
      label: 'Commission appointment',
      description: 'Appointed by judicial commission',
    },
  }

  return info[method] || { label: 'Unknown', description: '' }
}

/**
 * Get display information for election result
 */
function getElectionResultInfo(result: ElectionResult): {
  label: string
  icon: JSX.Element
  textColor: string
  bgColor: string
} {
  const iconClass = 'h-3 w-3'

  const info: Record<ElectionResult, ReturnType<typeof getElectionResultInfo>> = {
    [ElectionResult.WON]: {
      label: 'Won',
      icon: <CheckCircle className={`${iconClass} text-green-500`} aria-hidden />,
      textColor: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    [ElectionResult.LOST]: {
      label: 'Lost',
      icon: <XCircle className={`${iconClass} text-red-500`} aria-hidden />,
      textColor: 'text-red-600',
      bgColor: 'bg-red-500/10',
    },
    [ElectionResult.UNOPPOSED]: {
      label: 'Unopposed',
      icon: <CheckCircle className={`${iconClass} text-blue-500`} aria-hidden />,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    [ElectionResult.WITHDRAWN]: {
      label: 'Withdrawn',
      icon: <AlertCircle className={`${iconClass} text-amber-500`} aria-hidden />,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    [ElectionResult.PENDING]: {
      label: 'Pending',
      icon: <Calendar className={`${iconClass} text-gray-500`} aria-hidden />,
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-500/10',
    },
    [ElectionResult.RETAINED]: {
      label: 'Retained',
      icon: <CheckCircle className={`${iconClass} text-green-500`} aria-hidden />,
      textColor: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    [ElectionResult.NOT_RETAINED]: {
      label: 'Not retained',
      icon: <XCircle className={`${iconClass} text-red-500`} aria-hidden />,
      textColor: 'text-red-600',
      bgColor: 'bg-red-500/10',
    },
  }

  return info[result] || {
    label: 'Unknown',
    icon: <AlertCircle className={`${iconClass} text-gray-500`} aria-hidden />,
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-500/10',
  }
}

/**
 * Get display label for election type
 */
function getElectionTypeLabel(type: ElectionType): string {
  const labels: Record<ElectionType, string> = {
    [ElectionType.PARTISAN]: 'Partisan',
    [ElectionType.NONPARTISAN]: 'Nonpartisan',
    [ElectionType.RETENTION]: 'Retention',
    [ElectionType.RECALL]: 'Recall',
  }

  return labels[type] || 'Unknown'
}

/**
 * Format political party for display
 */
function formatPoliticalParty(party: PoliticalParty): string {
  const labels: Record<PoliticalParty, string> = {
    [PoliticalParty.DEMOCRATIC]: 'Democratic',
    [PoliticalParty.REPUBLICAN]: 'Republican',
    [PoliticalParty.LIBERTARIAN]: 'Libertarian',
    [PoliticalParty.GREEN]: 'Green',
    [PoliticalParty.INDEPENDENT]: 'Independent',
    [PoliticalParty.NONPARTISAN]: 'Nonpartisan',
    [PoliticalParty.UNKNOWN]: 'Unknown',
    [PoliticalParty.OTHER]: 'Other',
  }

  return labels[party] || 'Unknown'
}
