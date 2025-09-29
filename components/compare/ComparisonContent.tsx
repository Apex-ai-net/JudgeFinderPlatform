'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Scale, Users, TrendingUp, BarChart, Calendar, MapPin, Gavel, Loader2, Award, Activity } from 'lucide-react'
import { useSearchDebounce } from '@/lib/hooks/useDebounce'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fadeInUp, staggerContainer, staggerItem, cardHover } from '@/lib/animations/presets'
import { colors, spacing, borderRadius, shadows } from '@/lib/design-system/tokens'
import type { Judge } from '@/types'

interface ComparisonContentProps {
  initialJudges?: Judge[]
}

export function ComparisonContent({ initialJudges = [] }: ComparisonContentProps) {
  const [selectedJudges, setSelectedJudges] = useState<Judge[]>(initialJudges)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Judge[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [analytics, setAnalytics] = useState<Record<string, any>>({})
  const [loadingAnalytics, setLoadingAnalytics] = useState<Record<string, boolean>>({})
  const [searchError, setSearchError] = useState<string | null>(null)

  const { debouncedSearchQuery } = useSearchDebounce(searchQuery, 300)

  // Search for judges
  useEffect(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
      setSearchResults([])
      setSearchError(null)
      return
    }

    const searchJudges = async () => {
      setIsSearching(true)
      setSearchError(null)
      try {
        const response = await fetch(`/api/judges/list?q=${encodeURIComponent(debouncedSearchQuery)}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.judges || [])
          if ((data.judges || []).length === 0) {
            setSearchError('No judges found for your query.')
          }
        }
        if (!response.ok) {
          setSearchError('Unable to search judges right now. Please try again.')
        }
      } catch (error) {
        console.error('Search error:', error)
        setSearchError('Unable to search judges right now. Please try again.')
      } finally {
        setIsSearching(false)
      }
    }

    searchJudges()
  }, [debouncedSearchQuery])

  // Fetch analytics for selected judges
  useEffect(() => {
    selectedJudges.forEach(judge => {
      if (!analytics[judge.id] && !loadingAnalytics[judge.id]) {
        fetchJudgeAnalytics(judge.id)
      }
    })
  }, [selectedJudges, analytics, loadingAnalytics])

  const fetchJudgeAnalytics = async (judgeId: string) => {
    setLoadingAnalytics(prev => ({ ...prev, [judgeId]: true }))
    try {
      const response = await fetch(`/api/judges/${judgeId}/analytics`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(prev => ({ ...prev, [judgeId]: data }))
      }
    } catch (error) {
      console.error('Analytics error:', error)
    } finally {
      setLoadingAnalytics(prev => ({ ...prev, [judgeId]: false }))
    }
  }

  const addJudge = (judge: Judge) => {
    if (selectedJudges.length < 3 && !selectedJudges.find(j => j.id === judge.id)) {
      setSelectedJudges([...selectedJudges, judge])
      setSearchQuery('')
      setSearchResults([])
      setSearchError(null)
      setShowSearch(false)
    }
  }

  const removeJudge = (judgeId: string) => {
    setSelectedJudges(selectedJudges.filter(j => j.id !== judgeId))
    const newAnalytics = { ...analytics }
    delete newAnalytics[judgeId]
    setAnalytics(newAnalytics)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not available'
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return 'Not available'
    }
  }

  const getExperience = (appointedDate: string | null) => {
    if (!appointedDate) return 'N/A'
    try {
      const years = new Date().getFullYear() - new Date(appointedDate).getFullYear()
      return `${years} years`
    } catch {
      return 'N/A'
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Add Judge Search Section */}
      {selectedJudges.length < 3 && (
        <motion.div
          className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Select Judges to Compare</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Compare up to 3 judges • Currently comparing {selectedJudges.length}
              </p>
            </div>
            {!showSearch && (
              <Button
                onClick={() => setShowSearch(true)}
                variant="gradient"
                size="default"
              >
                <Search className="w-4 h-4" />
                Add Judge
              </Button>
            )}
          </div>

          {showSearch && (
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a judge by name..."
                className="w-full pl-10 pr-10 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
              )}
              {!isSearching && (
                <button
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                    setSearchResults([])
                    setSearchError(null)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </motion.div>
          )}

          {/* Search Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                className="mt-4 border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto bg-background"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {searchResults.map((judge, index) => (
                  <motion.button
                    key={judge.id}
                    onClick={() => addJudge(judge)}
                    disabled={selectedJudges.find(j => j.id === judge.id) !== undefined}
                    className="w-full px-4 py-3 text-left hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="font-medium text-foreground group-hover:text-primary transition-colors">{judge.name}</div>
                    <div className="text-sm text-muted-foreground">{judge.court_name}</div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {searchError && !isSearching && (
            <motion.div
              className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {searchError}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Side-by-Side Judge Comparison Cards */}
      {selectedJudges.length > 0 ? (
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {selectedJudges.map((judge, index) => {
            const judgeAnalytics = analytics[judge.id]
            const isLoading = loadingAnalytics[judge.id]

            return (
              <motion.div
                key={judge.id}
                className="relative rounded-xl border border-border bg-card shadow-md hover:shadow-lg transition-all"
                variants={cardHover}
                initial="initial"
                whileHover="hover"
              >
                {/* Remove Button */}
                <button
                  onClick={() => removeJudge(judge.id)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-destructive/10 border border-border hover:border-destructive/20 transition-all group"
                  aria-label={`Remove ${judge.name}`}
                >
                  <X className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                </button>

                {/* Judge Header */}
                <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <Gavel className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 pr-8">
                      <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-2">{judge.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{judge.court_name}</p>
                    </div>
                  </div>
                </div>

                {/* Basic Info Section */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Jurisdiction:</span>
                    <span className="font-medium text-foreground ml-auto text-right">{judge.jurisdiction || 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Appointed:</span>
                    <span className="font-medium text-foreground ml-auto text-right">{formatDate(judge.appointed_date)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Experience:</span>
                    <span className="font-medium text-foreground ml-auto text-right">{getExperience(judge.appointed_date)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Total Cases:</span>
                    <span className="font-medium text-foreground ml-auto text-right">
                      {judge.total_cases ? judge.total_cases.toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Analytics Section */}
                <div className="p-6 pt-0 space-y-4 border-t border-border mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">AI Analytics</h4>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : judgeAnalytics ? (
                    <div className="space-y-4">
                      {/* Consistency Score */}
                      {judgeAnalytics.metrics?.consistency && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5" />
                              Consistency
                            </span>
                            <span className="font-bold text-lg text-foreground">{judgeAnalytics.metrics.consistency}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${judgeAnalytics.metrics.consistency}%` }}
                              transition={{ duration: 0.8, delay: index * 0.2 }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Speed Score */}
                      {judgeAnalytics.metrics?.speed && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                              <BarChart className="w-3.5 h-3.5" />
                              Speed
                            </span>
                            <span className="font-bold text-lg text-foreground">{judgeAnalytics.metrics.speed}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-success rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${judgeAnalytics.metrics.speed}%` }}
                              transition={{ duration: 0.8, delay: index * 0.2 + 0.1 }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Overall Bias Score */}
                      {judgeAnalytics.overall_bias_score && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                              <Scale className="w-3.5 h-3.5" />
                              Bias Score
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold text-foreground">{judgeAnalytics.overall_bias_score}</span>
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-semibold",
                                judgeAnalytics.overall_bias_score >= 80 ? "bg-success/20 text-success" :
                                judgeAnalytics.overall_bias_score >= 60 ? "bg-warning/20 text-warning" :
                                "bg-danger/20 text-danger"
                              )}>
                                {judgeAnalytics.overall_bias_score >= 80 ? 'Low' :
                                 judgeAnalytics.overall_bias_score >= 60 ? 'Moderate' : 'High'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No analytics available
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      ) : (
        <motion.div
          className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <Scale className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-2xl font-bold text-foreground mb-2">No Judges Selected</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start by searching and adding judges to compare their profiles, decision patterns, and AI-powered analytics side-by-side.
          </p>
        </motion.div>
      )}
    </div>
  )
}
