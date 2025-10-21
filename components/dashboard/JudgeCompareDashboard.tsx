'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Scale, ExternalLink, TrendingUp, FileText, Plus, X } from 'lucide-react'
import { SkipLink } from '@/components/ui/SkipLink'

interface Judge {
  id: string
  name: string
  slug: string
  court_name: string
  total_cases: number
  metadata?: any
}

interface JudgeCompareDashboardProps {
  user: any
  bookmarkedJudges: any[]
}

export default function JudgeCompareDashboard({
  user,
  bookmarkedJudges,
}: JudgeCompareDashboardProps) {
  const [selectedJudges, setSelectedJudges] = useState<Judge[]>([])

  const toggleJudge = (judge: Judge) => {
    if (selectedJudges.find((j) => j.id === judge.id)) {
      setSelectedJudges(selectedJudges.filter((j) => j.id !== judge.id))
    } else if (selectedJudges.length < 3) {
      setSelectedJudges([...selectedJudges, judge])
    }
  }

  const isSelected = (judgeId: string) => selectedJudges.some((j) => j.id === judgeId)

  return (
    <>
      <SkipLink />
      <main
        id="main-content"
        role="main"
        className="min-h-screen bg-background"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <Link
              href="/dashboard"
              className="text-sm text-primary hover:text-primary/80 mb-4 inline-flex items-center"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-foreground mt-2">Compare Judges</h1>
            <p className="mt-2 text-muted-foreground">
              Select up to 3 bookmarked judges to compare side-by-side
            </p>
          </header>

          {/* Selection Bar */}
          <section
            aria-labelledby="selected-judges-heading"
            className="mb-8 bg-card rounded-xl shadow-sm border border-border p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="selected-judges-heading" className="text-lg font-semibold text-foreground">
                Selected ({selectedJudges.length}/3)
              </h2>
              {selectedJudges.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedJudges([])}
                  className="text-sm text-destructive hover:text-destructive/80 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 rounded px-2 py-1"
                  aria-label="Clear all selected judges"
                >
                  Clear All
                </button>
              )}
            </div>

            {selectedJudges.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No judges selected. Choose from your bookmarks below.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedJudges.map((judge) => (
                  <div
                    key={judge.id}
                    className="p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{judge.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{judge.court_name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleJudge(judge)}
                      className="ml-2 text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                      aria-label={`Remove ${judge.name} from selection`}
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedJudges.length >= 2 && (
              <Link
                href={`/compare?judges=${selectedJudges.map((j) => j.slug).join(',')}`}
                className="mt-4 block w-full py-3 bg-primary text-primary-foreground text-center rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                aria-label={`Compare ${selectedJudges.length} selected judges`}
              >
                <Scale className="w-5 h-5 inline-block mr-2" aria-hidden="true" />
                Compare Selected Judges
              </Link>
            )}
          </section>

          {/* Bookmarked Judges List */}
          <section
            aria-labelledby="bookmarked-judges-heading"
            className="bg-card rounded-xl shadow-sm border border-border"
          >
            <div className="px-6 py-4 border-b border-border">
              <h2 id="bookmarked-judges-heading" className="text-lg font-semibold text-foreground">
                Your Bookmarked Judges
              </h2>
            </div>

            {bookmarkedJudges.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Scale className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium text-foreground mb-2">No bookmarked judges yet</h3>
                <p className="text-muted-foreground mb-6">
                  Bookmark judges to compare their patterns and rulings
                </p>
                <Link
                  href="/judges"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                  Browse Judges
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {bookmarkedJudges.map((bookmark) => {
                  const judge = bookmark.judges
                  if (!judge) return null

                  const selected = isSelected(judge.id)
                  const canSelect = selectedJudges.length < 3 || selected

                  return (
                    <div
                      key={bookmark.id}
                      className={`px-6 py-4 transition-colors ${
                        selected ? 'bg-primary/5' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <label
                              htmlFor={`judge-checkbox-${judge.id}`}
                              className="flex items-center space-x-3 flex-1 cursor-pointer"
                            >
                              <input
                                id={`judge-checkbox-${judge.id}`}
                                type="checkbox"
                                checked={selected}
                                onChange={() => canSelect && toggleJudge(judge)}
                                disabled={!canSelect}
                                className="w-5 h-5 text-primary rounded border-border focus:ring-primary disabled:opacity-50 focus:outline-none"
                                aria-label={`Select ${judge.name} from ${judge.court_name} for comparison`}
                              />
                              <div className="flex-1">
                                <p className="text-base font-medium text-foreground">{judge.name}</p>
                                <div className="mt-1 flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span>{judge.court_name}</span>
                                  {judge.total_cases > 0 && (
                                    <span className="flex items-center">
                                      <FileText className="w-4 h-4 mr-1" aria-hidden="true" />
                                      {judge.total_cases.toLocaleString()} cases
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>

                        <Link
                          href={`/judges/${judge.slug}`}
                          className="ml-4 inline-flex items-center px-3 py-2 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" />
                          View Profile
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Info Section */}
          <section
            aria-labelledby="comparison-features-heading"
            className="mt-8 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/30 p-6"
          >
            <h2
              id="comparison-features-heading"
              className="text-lg font-semibold text-foreground mb-3"
            >
              <TrendingUp className="w-5 h-5 inline-block mr-2" aria-hidden="true" />
              Comparison Features
            </h2>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Compare ruling patterns across different case types</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Analyze decision-making timelines and trends</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>View side-by-side bias analytics and confidence scores</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Export comparison reports for case preparation</span>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </>
  )
}
