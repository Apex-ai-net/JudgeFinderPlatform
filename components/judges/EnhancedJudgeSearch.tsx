'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Scale,
  Calendar,
  Target,
  TrendingUp,
  Clock,
  Users,
  Filter,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { AdvancedSearchFilters } from './AdvancedSearchFilters'
import { generateSlug } from '@/lib/utils/slug'
import {
  AnimatedInput,
  AnimatedCard,
  AnimatedButton,
  AnimatedNumber,
} from '@/components/micro-interactions'
import { ProgressRing } from '@/components/charts'
import type { Judge } from '@/types'

interface JudgeSearchResult extends Judge {
  match_score: number
  experience_years: number
  efficiency_score: number
  settlement_rate: number
  primary_specialization: string
}

interface AdvancedJudgeFilters {
  case_types: string[]
  min_experience: number
  max_experience: number
  case_value_range: string
  efficiency_level: string
  settlement_rate_min: number
  settlement_rate_max: number
  specialization: string
  court_types: string[]
}

interface AdvancedJudgeSearchResponse {
  judges: JudgeSearchResult[]
  total_count: number
  page: number
  per_page: number
  has_more: boolean
  applied_filters: AdvancedJudgeFilters
  search_took_ms: number
}

export function EnhancedJudgeSearch(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AdvancedJudgeSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<AdvancedJudgeFilters | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const performSearch = useCallback(async (query: string, searchFilters: any, page = 1) => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (query.trim()) {
        params.append('q', query.trim())
      }

      // Add filter parameters
      if (searchFilters) {
        Object.entries(searchFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== 0 && value !== 100 && value !== 50) {
            if (Array.isArray(value) && value.length > 0) {
              params.append(key, value.join(','))
            } else if (!Array.isArray(value) && value !== null) {
              params.append(key, value.toString())
            }
          }
        })
      }

      const response = await fetch(`/api/judges/advanced-search?${params.toString()}`)

      if (response.ok) {
        const data: AdvancedJudgeSearchResponse = await response.json()
        setSearchResults(data)
      } else {
        console.error('Search failed:', response.statusText)
        setSearchResults(null)
        setErrorMessage('Unable to load judge search results. Please try again.')
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults(null)
      setErrorMessage('Unable to load judge search results. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = () => {
    setCurrentPage(1)
    performSearch(searchQuery, filters, 1)
  }

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setCurrentPage(1)
    performSearch(searchQuery, newFilters, 1)
  }

  const handleClearFilters = () => {
    setFilters(null)
    setCurrentPage(1)
    performSearch(searchQuery, null, 1)
  }

  const loadMore = async () => {
    if (!searchResults?.has_more || loading) return
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)

    // Fetch next page then append
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: nextPage.toString(), limit: '20' })
      if (searchQuery.trim()) params.append('q', searchQuery.trim())
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== 0 && value !== 100 && value !== 50) {
            if (Array.isArray(value) && value.length > 0) params.append(key, value.join(','))
            else if (!Array.isArray(value) && value !== null) params.append(key, value.toString())
          }
        })
      }

      const res = await fetch(`/api/judges/advanced-search?${params.toString()}`)
      if (!res.ok) return
      const data: AdvancedJudgeSearchResponse = await res.json()
      setSearchResults((prev) =>
        prev
          ? {
              ...prev,
              judges: [...prev.judges, ...data.judges],
              page: data.page,
              per_page: data.per_page,
              has_more: data.has_more,
              total_count: data.total_count,
            }
          : data
      )
    } finally {
      setLoading(false)
    }
  }

  // Initial load - show some judges by default
  useEffect(() => {
    performSearch('', null, 1)
  }, [performSearch])

  const getExperienceColor = (years: number) => {
    if (years >= 20) return 'text-secondary'
    if (years >= 10) return 'text-primary'
    if (years >= 5) return 'text-success'
    return 'text-warning'
  }

  const getEfficiencyColor = (score: number) => {
    if (score >= 15) return 'text-success'
    if (score >= 5) return 'text-warning'
    return 'text-destructive'
  }

  const getSettlementColor = (rate: number) => {
    if (rate >= 0.6) return 'text-success'
    if (rate >= 0.4) return 'text-warning'
    return 'text-destructive'
  }

  const totalCountDisplay =
    typeof searchResults?.total_count === 'number'
      ? searchResults.total_count.toLocaleString()
      : 'statewide'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Advanced Search</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-enterprise-primary to-enterprise-deep bg-clip-text text-transparent">
            Find the Right Judge for Your Case
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Search through {totalCountDisplay} California judges with advanced filtering by case
            type, experience, settlement rates, and judicial patterns.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          className="max-w-4xl mx-auto mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <AnimatedInput
                type="text"
                placeholder="Search judges by name, court, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                icon={<Search className="h-5 w-5" />}
                loading={loading && searchResults === null}
                intensity="strong"
              />
            </div>
            <AnimatedButton
              onClick={handleSearch}
              disabled={loading}
              loading={loading && searchResults === null}
              variant="primary"
              size="lg"
              icon={<Search className="h-5 w-5" />}
              iconPosition="left"
            >
              Search
            </AnimatedButton>
          </div>
        </motion.div>

        {/* Advanced Filters */}
        <AdvancedSearchFilters
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen(!filtersOpen)}
        />

        {errorMessage && (
          <div className="max-w-4xl mx-auto mb-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Search Results Summary */}
        {searchResults && (
          <div className="mb-6 flex justify-between items-center">
            <div className="text-muted-foreground">
              Showing {searchResults.judges.length} of {totalCountDisplay} judges
              {searchResults.search_took_ms && (
                <span className="text-muted-foreground ml-2">
                  ({searchResults.search_took_ms}ms)
                </span>
              )}
            </div>
            {searchResults.applied_filters &&
              Object.values(searchResults.applied_filters).some(
                (v) => v && v !== '' && (!Array.isArray(v) || v.length > 0)
              ) && <div className="text-primary text-sm">Advanced filters applied</div>}
          </div>
        )}

        {/* Loading State */}
        {loading && !searchResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse rounded-lg border border-border bg-card/60 p-6"
              >
                <div className="h-4 w-1/2 bg-card rounded mb-3" />
                <div className="h-3 w-2/3 bg-card rounded mb-2" />
                <div className="h-3 w-1/3 bg-card rounded mb-6" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-card rounded" />
                  <div className="h-3 w-3/4 bg-card rounded" />
                  <div className="h-3 w-2/5 bg-card rounded" />
                  <div className="h-3 w-1/2 bg-card rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {searchResults && searchResults.judges.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <AnimatePresence mode="popLayout">
              {searchResults.judges.map((judge, index) => (
                <motion.div
                  key={judge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  <Link href={`/judges/${generateSlug(judge.name)}`} className="block h-full">
                    <AnimatedCard
                      intensity="medium"
                      className="h-full p-6 shadow-card hover:shadow-elevated"
                    >
                      {/* Match Score Indicator */}
                      {judge.match_score < 1.0 && (
                        <motion.div
                          className="flex justify-end mb-3"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary to-primary/80 text-white text-xs font-semibold rounded-full shadow-sm">
                            <Sparkles className="h-3 w-3" />
                            <AnimatedNumber value={Math.round(judge.match_score * 100)} />% match
                          </div>
                        </motion.div>
                      )}

                      {/* Judge Info */}
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
                          {judge.name}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-2 line-clamp-1">
                          {judge.court_name}
                        </p>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Scale className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{judge.jurisdiction}</span>
                        </div>
                      </div>

                      {/* Key Metrics with Color Coding */}
                      <div className="space-y-2.5 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Experience
                          </span>
                          <span
                            className={`font-semibold ${getExperienceColor(judge.experience_years)}`}
                          >
                            {judge.experience_years} yrs
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Efficiency
                          </span>
                          <span
                            className={`font-semibold ${getEfficiencyColor(judge.efficiency_score)}`}
                          >
                            {judge.efficiency_score.toFixed(1)}/mo
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5" />
                            Settlement
                          </span>
                          <span
                            className={`font-semibold ${getSettlementColor(judge.settlement_rate)}`}
                          >
                            {(judge.settlement_rate * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Specialization
                          </span>
                          <span className="text-primary font-semibold text-sm line-clamp-1 max-w-[150px] text-right">
                            {judge.primary_specialization}
                          </span>
                        </div>
                      </div>

                      {/* Total Cases */}
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Total Cases
                          </span>
                          <span className="text-success font-semibold">
                            <AnimatedNumber value={judge.total_cases || 0} />
                          </span>
                        </div>
                      </div>

                      {/* View Details Arrow */}
                      <motion.div
                        className="mt-4 flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                        whileHover={{ x: 5 }}
                      >
                        View full profile
                        <ArrowRight className="h-3.5 w-3.5" />
                      </motion.div>
                    </AnimatedCard>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Load More */}
        {searchResults?.has_more && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <AnimatedButton
              onClick={loadMore}
              disabled={loading}
              loading={loading}
              variant="outline"
              size="lg"
            >
              Load More Judges
            </AnimatedButton>
          </motion.div>
        )}

        {/* No Results */}
        {searchResults && searchResults.judges.length === 0 && !loading && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              <Scale className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            </motion.div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No judges found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Try adjusting your search query or filters to find more results.
            </p>
            <AnimatedButton
              onClick={handleClearFilters}
              variant="primary"
              size="md"
              icon={<Filter className="h-4 w-4" />}
              iconPosition="left"
            >
              Clear Filters
            </AnimatedButton>
          </motion.div>
        )}
      </div>
    </div>
  )
}
