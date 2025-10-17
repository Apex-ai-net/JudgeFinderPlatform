'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { JurisdictionHeroSection } from './components/JurisdictionHeroSection'
import { JurisdictionSearchPanel } from './components/JurisdictionSearchPanel'
import { CourtsGridSection } from './components/CourtsGridSection'
import { JurisdictionQuickLinks } from './components/JurisdictionQuickLinks'
import CountyAdSection from './components/CountyAdSection'
import { jurisdictionMap } from './constants'
import { CourtInfo, CourtsQueryResult } from './types'

export default function CountyCourtsPage(): JSX.Element {
  const params = useParams()
  const county = params.county as string
  const [searchQuery, setSearchQuery] = useState('')
  const [courts, setCourts] = useState<CourtInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Get jurisdiction info
  const jurisdictionInfo = jurisdictionMap[county]

  const fetchCourts = useCallback(
    async (page = 1, reset = false) => {
      if (!jurisdictionInfo) return
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          jurisdiction: jurisdictionInfo.jurisdictionValue,
        })

        // Add county filter if available
        if (jurisdictionInfo.countyName) {
          params.append('county', jurisdictionInfo.countyName)
        }

        if (searchQuery.trim()) params.append('q', searchQuery)

        const response = await fetch(`/api/courts?${params}`)
        if (!response.ok) throw new Error('Failed to fetch courts')

        const data: CourtsQueryResult = await response.json()

        if (reset || page === 1) {
          setCourts(data.courts)
        } else {
          setCourts((prev) => [...prev, ...data.courts])
        }

        setTotalCount(data.total_count)
        setCurrentPage(data.page)
        setHasMore(data.has_more)
      } catch (error) {
        console.error('Error fetching courts:', error)
      } finally {
        setLoading(false)
      }
    },
    [searchQuery, jurisdictionInfo]
  )

  useEffect(() => {
    fetchCourts(1, true)
  }, [fetchCourts])

  if (!jurisdictionInfo) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Jurisdiction Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The requested jurisdiction could not be found.
          </p>
          <Link
            href="/jurisdictions"
            className="bg-interactive text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-interactive-hover"
          >
            ← Back to Jurisdictions
          </Link>
        </div>
      </div>
    )
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchCourts(currentPage + 1, false)
    }
  }

  const totalJudges = courts.reduce((sum, court) => sum + (court.judge_count || 0), 0)

  return (
    <div className="min-h-screen bg-surface-sunken text-foreground">
      <JurisdictionHeroSection
        jurisdiction={jurisdictionInfo}
        totalCourts={totalCount}
        totalJudges={totalJudges}
      />

      {/* Top Inline Ad */}
      <CountyAdSection
        title={`Sponsored in ${jurisdictionInfo.displayName}`}
        slot={`jurisdiction-top-${county}`}
        className="mt-8"
      />

      <JurisdictionSearchPanel
        jurisdiction={jurisdictionInfo}
        searchValue={searchQuery}
        totalCourts={totalCount}
        visibleCourts={courts.length}
        loading={loading}
        onSearchChange={setSearchQuery}
      />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Mid-content Ad */}
        <CountyAdSection
          title="Sponsored Resources"
          slot={`jurisdiction-mid-${county}`}
          className="mb-6"
        />

        <CourtsGridSection
          courts={courts}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />

        {/* Bottom Inline Ad */}
        <div className="mt-8">
          <CountyAdSection title="Local Legal Services" slot={`jurisdiction-bottom-${county}`} />
        </div>
      </section>

      <JurisdictionQuickLinks jurisdiction={jurisdictionInfo} />
    </div>
  )
}
