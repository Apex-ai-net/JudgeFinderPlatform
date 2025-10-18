import { Suspense } from 'react'
import type { Metadata } from 'next'
import { JudgesView } from './JudgesView'
import { JudgeCardSkeleton, SearchSkeleton } from '@/components/ui/Skeleton'
import { TypewriterText } from '@/components/ui/TypewriterText'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'
import { getBaseUrl } from '@/lib/utils/baseUrl'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'California Judges Directory | JudgeFinder',
  description:
    'Search California judges with comprehensive profiles, judicial analytics, and comparison tools. Filter by court, jurisdiction, experience, and bias indicators.',
  alternates: {
    canonical: `${BASE_URL}/judges`,
  },
  openGraph: {
    title: 'California Judges Directory | JudgeFinder',
    description:
      'Explore detailed judge profiles, court assignments, and comprehensive analytics for California courts.',
    url: `${BASE_URL}/judges`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'California Judges Directory | JudgeFinder',
    description: 'Find judicial profiles, analytics, and comparison tools for California courts.',
  },
}

// Loading fallback component for Suspense
function JudgesLoading(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Enhanced Hero Section with Animations - Matching New Design */}
      <section className="relative min-h-[60vh] flex items-center justify-center">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                California Judges
              </span>
              <br />
              <span className="text-foreground">
                <TypewriterText text="Directory" />
              </span>
            </h1>
          </div>

          <p className="mx-auto mb-12 max-w-2xl text-lg md:text-xl text-muted-foreground">
            Loading judicial profiles and analytics...
          </p>
        </div>

        <ScrollIndicator />
      </section>

      {/* Search and Filters Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SearchSkeleton />
      </div>

      {/* Judges Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index}>
              <JudgeCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function getInitialJudges(page: number = 1): Promise<any> {
  try {
    // Server-side: Use baseUrl for absolute URL (works in preview/production)
    // This ensures SSR works in all Netlify environments (preview, branch, production)
    const baseUrl = getBaseUrl()
    const apiUrl = `${baseUrl}/api/judges/list?limit=24&page=${page}&jurisdiction=CA&include_decisions=true`

    const response = await fetch(apiUrl, {
      cache: 'no-store',
    })

    if (!response.ok) return null
    const data = await response.json()
    return data
  } catch {
    return null
  }
}

export default async function JudgesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}): Promise<JSX.Element> {
  // Await searchParams (required in Next.js 15+)
  const params = await searchParams

  // Read page from URL query parameter
  const pageParam = params.page ? parseInt(params.page, 10) : 1

  // Validate page number (must be positive integer)
  const validPage = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1

  // Debug logging
  console.log('[SSR Pagination Debug]', {
    rawParams: params,
    pageParam,
    validPage,
    willFetch: `/api/judges/list?page=${validPage}`,
  })

  // Fetch data for the requested page
  const initialData = await getInitialJudges(validPage)

  return (
    <Suspense fallback={<JudgesLoading />}>
      <JudgesView initialData={initialData || undefined} />
    </Suspense>
  )
}
