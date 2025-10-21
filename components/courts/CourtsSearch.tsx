'use client'

import { useState, useEffect } from 'react'
import {
  Building,
  MapPin,
  Users,
  Scale,
  Search,
  Loader2,
  ArrowRight,
  Sparkles,
  Landmark,
  Building2,
  Flag,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSearchDebounce } from '@/lib/hooks/useDebounce'
import { CourtCardSkeleton } from '@/components/ui/Skeleton'
import { resolveCourtSlug } from '@/lib/utils/slug'
import { AnimatedCard, AnimatedBadge } from '@/components/micro-interactions'
import GlassCard from '@/components/ui/GlassCard'
import { CourtGroupAccordion } from './CourtGroupAccordion'

interface Court {
  id: string
  name: string
  type: string
  jurisdiction: string
  slug?: string
  address?: string | number
  phone?: string
  website?: string
  judge_count: number
  court_level?: string | null
}

interface CourtsResponse {
  courts: Court[]
  total_count: number
  page: number
  per_page: number
  has_more: boolean
}

interface CourtsSearchProps {
  initialCourts: Court[]
  initialJurisdiction?: string
}

// Helper to get court type icon and color
function getCourtTypeInfo(court: Court): {
  icon: any
  color: string
  bgColor: string
  label: string
} {
  // Priority 1: Use court_level if available (most reliable)
  if (court.court_level) {
    const level = court.court_level.toLowerCase()

    if (level === 'federal' || level.includes('federal')) {
      return {
        icon: Flag,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        label: 'Federal',
      }
    }

    if (
      level === 'state' ||
      level.includes('state') ||
      level.includes('appellate') ||
      level.includes('supreme')
    ) {
      return {
        icon: Landmark,
        color: 'text-secondary',
        bgColor: 'bg-secondary/10',
        label: 'State',
      }
    }
  }

  // Priority 2: Check type field as fallback
  const normalizedType = court.type.toLowerCase()

  if (
    normalizedType.includes('federal') ||
    normalizedType.includes('district') ||
    normalizedType.includes('bankruptcy')
  ) {
    return {
      icon: Flag,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      label: 'Federal',
    }
  }

  if (
    normalizedType.includes('supreme') ||
    normalizedType.includes('appellate') ||
    normalizedType.includes('appeal')
  ) {
    return {
      icon: Landmark,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      label: 'State Appellate',
    }
  }

  // Priority 3: Check jurisdiction for federal indicators
  if (court.jurisdiction === 'US' || court.jurisdiction === 'Federal') {
    return {
      icon: Flag,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      label: 'Federal',
    }
  }

  // Default to County/Superior Court
  return {
    icon: Building2,
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'County',
  }
}

// Helper to format court name for display
function formatCourtName(courtName: string, court_level?: string | null): string {
  // Federal courts - keep as is (usually already well-formatted)
  if (
    court_level === 'federal' ||
    courtName.includes('U.S.') ||
    courtName.includes('United States')
  ) {
    return courtName
  }

  // California Superior Courts - format as "[County] County Superior Court"
  const countyMatch = courtName.match(/Superior Court of California[,\s]*County of ([^,]+)/i)
  if (countyMatch) {
    const county = countyMatch[1].trim()
    return `${county} County Superior Court`
  }

  // Already formatted county superior courts
  if (courtName.match(/^([^,]+?) County Superior Court/i)) {
    return courtName
  }

  // State appellate courts - keep as is
  if (courtName.includes('Court of Appeal') || courtName.includes('Supreme Court')) {
    return courtName
  }

  // Default: return as is
  return courtName
}

// Helper to get short court type description
function getCourtTypeDescription(court: Court): string {
  const typeInfo = getCourtTypeInfo(court)

  if (typeInfo.label === 'Federal') {
    if (court.name.includes('District')) return 'Federal District Court'
    if (court.name.includes('Bankruptcy')) return 'Federal Bankruptcy Court'
    if (court.name.includes('Circuit')) return 'Federal Circuit Court'
    return 'Federal Court'
  }

  if (typeInfo.label === 'State Appellate' || typeInfo.label === 'State') {
    if (court.name.includes('Supreme')) return 'State Supreme Court'
    if (court.name.includes('Appeal')) return 'State Appellate Court'
    return 'State Court'
  }

  return 'Superior Court'
}

// Helper to extract county from court name
function extractCounty(courtName: string): string | null {
  // Pattern: "Superior Court of California, County of [County Name]"
  const countyMatch = courtName.match(/County of ([^,]+)/i)
  if (countyMatch) {
    return countyMatch[1].trim()
  }

  // Pattern: "[County Name] County Superior Court"
  const countyMatch2 = courtName.match(/^([^,]+?) County Superior Court/i)
  if (countyMatch2) {
    return countyMatch2[1].trim()
  }

  return null
}

// Helper to group courts by type and county
function groupCourts(courts: Court[]): {
  federal: Court[]
  stateAppellate: Court[]
  counties: Map<string, Court[]>
} {
  const federal: Court[] = []
  const stateAppellate: Court[] = []
  const counties = new Map<string, Court[]>()

  courts.forEach((court) => {
    const typeInfo = getCourtTypeInfo(court)

    if (typeInfo.label === 'Federal') {
      federal.push(court)
    } else if (typeInfo.label === 'State Appellate' || typeInfo.label === 'State') {
      stateAppellate.push(court)
    } else {
      // County court
      const county = extractCounty(court.name) || 'Other'
      if (!counties.has(county)) {
        counties.set(county, [])
      }
      counties.get(county)!.push(court)
    }
  })

  return { federal, stateAppellate, counties }
}

export function CourtsSearch({
  initialCourts,
  initialJurisdiction = 'CA',
}: CourtsSearchProps): JSX.Element {
  const [selectedCourtLevel, setSelectedCourtLevel] = useState('')
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(initialJurisdiction)
  const [searchInput, setSearchInput] = useState('')
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [loading, setLoading] = useState(initialCourts.length === 0)
  const [initialLoad, setInitialLoad] = useState(initialCourts.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(initialCourts.length)
  const [groupByCounty, setGroupByCounty] = useState(true)

  // Render a single court card
  const renderCourtCard = (court: Court, index: number): JSX.Element => {
    const typeInfo = getCourtTypeInfo(court)
    const TypeIcon = typeInfo.icon
    const slug = resolveCourtSlug(court) || court.id

    return (
      <motion.div
        key={court.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.5 }}
      >
        <Link href={`/courts/${slug}`} className="block h-full group">
          <GlassCard className="relative h-full p-6 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg transition-all duration-200">
            {/* Gradient Overlay on Hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className={`h-12 w-12 rounded-xl ${typeInfo.bgColor} flex items-center justify-center`}>
                    <TypeIcon className={`h-6 w-6 ${typeInfo.color}`} />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary/80" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Type Badge */}
                <div className="mb-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                </div>

                {/* Court Name */}
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-2">
                  {formatCourtName(court.name, court.court_level)}
                </h3>

                {/* Court Type Description */}
                <p className="text-xs text-muted-foreground mb-3">
                  {getCourtTypeDescription(court)}
                </p>

                {/* Meta Information */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{court.jurisdiction}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      {court.judge_count} {court.judge_count === 1 ? 'judge' : 'judges'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Scale className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{court.jurisdiction} jurisdiction</span>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {court.website && (
                    <span className="inline-flex items-center rounded-full bg-interactive/10 px-3 py-1 text-primary">
                      Official Website
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    View Details
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </Link>
      </motion.div>
    )
  }

  // Use debounced search
  const { debouncedSearchQuery, isSearching } = useSearchDebounce(searchInput, 300)

  // Reset pagination when filters/search change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, selectedJurisdiction, selectedCourtLevel])

  // Fetch courts when page or filters change
  useEffect(() => {
    let isMounted = true
    let abortController: AbortController | null = null

    async function searchCourts(): Promise<void> {
      try {
        if (page === 1) {
          setLoading(true)
        }
        setError(null)

        abortController = new AbortController()

        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          ...(debouncedSearchQuery && { q: debouncedSearchQuery }),
          ...(selectedJurisdiction && { jurisdiction: selectedJurisdiction }),
          ...(selectedCourtLevel && { court_level: selectedCourtLevel }),
        })

        const res = await fetch(`/api/courts?${params}`, {
          signal: abortController.signal,
        })

        if (!isMounted) return

        if (!res.ok) {
          throw new Error(`Failed to load courts: ${res.status}`)
        }

        const data: CourtsResponse = await res.json()

        if (!isMounted) return

        if (page === 1) {
          setCourts(data.courts)
        } else {
          setCourts((prev) => [...prev, ...data.courts])
        }
        setHasMore(data.has_more)
        setTotalCount(data.total_count)
      } catch (error) {
        if (isMounted && !(error instanceof Error && error.name === 'AbortError')) {
          setError('Failed to load courts')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setInitialLoad(false)
        }
      }
    }

    searchCourts()

    return () => {
      isMounted = false
      if (abortController) {
        abortController.abort()
      }
    }
  }, [page, debouncedSearchQuery, selectedJurisdiction, selectedCourtLevel])

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <motion.div
        className="mx-auto max-w-5xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GlassCard className="p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search courts by name..."
                className="w-full rounded-xl border border-border bg-background py-3.5 pl-12 pr-12 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search courts"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* Filters Row - Centered Horizontal Layout */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <div className="min-w-[200px]">
                <label htmlFor="jurisdiction-filter" className="sr-only">
                  Jurisdiction
                </label>
                <select
                  id="jurisdiction-filter"
                  className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  value={selectedJurisdiction}
                  onChange={(e) => setSelectedJurisdiction(e.target.value)}
                  aria-label="Filter by jurisdiction"
                >
                  <option value="">All Jurisdictions</option>
                  <option value="CA">California</option>
                  <option value="US">United States (Federal)</option>
                </select>
              </div>

              <div className="min-w-[200px]">
                <label htmlFor="court-level-filter" className="sr-only">
                  Court Level
                </label>
                <select
                  id="court-level-filter"
                  className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  value={selectedCourtLevel}
                  onChange={(e) => setSelectedCourtLevel(e.target.value)}
                  aria-label="Filter by court level"
                >
                  <option value="">All Court Levels</option>
                  <option value="federal">Federal Courts</option>
                  <option value="state">State Courts (Appellate/Supreme)</option>
                  <option value="">County Superior Courts</option>
                </select>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          className="bg-destructive/10 border border-destructive/30 rounded-lg p-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-destructive">{error}</div>
        </motion.div>
      )}

      {/* Results Summary */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          {loading && courts.length === 0 ? (
            <span className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
              Loading courts...
            </span>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-primary" />
              Showing {courts.length} of {totalCount.toLocaleString()} courts
            </>
          )}
        </p>

        <button
          onClick={() => setGroupByCounty(!groupByCounty)}
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
        >
          <Building className="h-4 w-4" />
          {groupByCounty ? 'Show All' : 'Group by County'}
        </button>
      </motion.div>

      {/* Grouped Courts Display with Accordions */}
      {groupByCounty &&
        courts.length > 0 &&
        !loading &&
        (() => {
          const { federal, stateAppellate, counties } = groupCourts(courts)
          const sortedCounties = Array.from(counties.entries()).sort((a, b) =>
            a[0].localeCompare(b[0])
          )

          return (
            <div className="space-y-4">
              {/* Federal Courts Accordion */}
              {federal.length > 0 && (
                <CourtGroupAccordion
                  title="Federal Courts"
                  icon={Flag}
                  iconColor="text-primary"
                  iconBgColor="bg-primary/10"
                  count={federal.length}
                  defaultOpen={true}
                >
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {federal.map((court, index) => renderCourtCard(court, index))}
                  </div>
                </CourtGroupAccordion>
              )}

              {/* State Appellate Courts Accordion */}
              {stateAppellate.length > 0 && (
                <CourtGroupAccordion
                  title="State Courts"
                  icon={Landmark}
                  iconColor="text-secondary"
                  iconBgColor="bg-secondary/10"
                  count={stateAppellate.length}
                  defaultOpen={true}
                >
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stateAppellate.map((court, index) => renderCourtCard(court, index))}
                  </div>
                </CourtGroupAccordion>
              )}

              {/* County Superior Courts Accordions */}
              {sortedCounties.map(([county, countyCourts]) => (
                <CourtGroupAccordion
                  key={county}
                  title={`${county} County`}
                  icon={Building2}
                  iconColor="text-success"
                  iconBgColor="bg-success/10"
                  count={countyCourts.length}
                  defaultOpen={false}
                >
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {countyCourts.map((court, index) => renderCourtCard(court, index))}
                  </div>
                </CourtGroupAccordion>
              ))}
            </div>
          )
        })()}

      {/* Ungrouped Courts Grid */}
      {!groupByCounty && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courts.map((court, index) => renderCourtCard(court, index))}

          {/* Show skeleton cards while loading more */}
          {loading && hasMore && (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <CourtCardSkeleton key={`loading-${index}`} />
              ))}
            </>
          )}

          {/* Show skeleton cards during initial search */}
          {loading && courts.length === 0 && (
            <>
              {Array.from({ length: 6 }).map((_, index) => (
                <CourtCardSkeleton key={`initial-${index}`} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && courts.length > 0 && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="bg-primary/10 text-primary px-8 py-3 rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Courts'
            )}
          </button>
        </motion.div>
      )}
    </div>
  )
}
