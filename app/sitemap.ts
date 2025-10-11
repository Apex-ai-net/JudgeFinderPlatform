import type { MetadataRoute } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { createCanonicalSlug, resolveCourtSlug } from '@/lib/utils/slug'
import { getBaseUrl } from '@/lib/utils/baseUrl'

// Force dynamic rendering since we need to query the database
export const dynamic = 'force-dynamic'

// Sitemap protocol limits: Max 50,000 URLs per sitemap file
// If exceeded, we'll need to implement sitemap index files
const MAX_SITEMAP_URLS = 50000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getBaseUrl()

  // Create Supabase client with error handling
  let supabase
  try {
    supabase = await createServerClient()
  } catch (error) {
    console.error('[Sitemap] Failed to create Supabase client:', error)
    // Return minimal sitemap with static pages only on database connection failure
    return getStaticPages(siteUrl)
  }

  // Fetch ALL judges (no limit) for complete AEO coverage
  // Priority: Higher for judges with more cases and recent activity
  const { data: judges, error: judgesError } = await supabase
    .from('judges')
    .select('name, slug, updated_at, jurisdiction, case_count')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('case_count', { ascending: false, nullsFirst: false })

  if (judgesError) {
    console.error('[Sitemap] Failed to fetch judges:', judgesError)
  }

  const judgeEntries = (judges || []).map((j) => {
    // Use canonical slug - either from database or generate one
    const canonicalSlug = j.slug || createCanonicalSlug(j.name)

    // Ensure lastModified is properly formatted as Date object
    // This prevents invalid date strings in the XML sitemap
    let lastModified: Date
    try {
      lastModified = j.updated_at ? new Date(j.updated_at) : new Date()
      // Validate the date is valid
      if (isNaN(lastModified.getTime())) {
        lastModified = new Date()
      }
    } catch (error) {
      console.error(`[Sitemap] Invalid date for judge ${j.name}:`, error)
      lastModified = new Date()
    }

    // Dynamic priority scoring based on case count for better AEO
    // Formula: Base priority (0.85) + boost based on case volume (up to +0.1)
    // High-profile judges (100+ cases) get 0.95 priority
    // Average judges get 0.85-0.90 priority
    const caseCount = (j as any).case_count || 0
    const basePriority = 0.85
    const priorityBoost = Math.min(0.1, (caseCount / 100) * 0.1)
    const priority = Number((basePriority + priorityBoost).toFixed(2))

    return {
      url: `${siteUrl}/judges/${canonicalSlug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority,
    }
  })

  // Add court entries to sitemap
  const { data: courts, error: courtsError } = await supabase
    .from('courts')
    .select('name, slug, updated_at')
    .limit(500)

  if (courtsError) {
    console.error('[Sitemap] Failed to fetch courts:', courtsError)
  }

  const courtEntries = (courts || []).map((c) => {
    const slug = resolveCourtSlug(c) || createCanonicalSlug(c.name)

    let lastModified: Date
    try {
      lastModified = c.updated_at ? new Date(c.updated_at) : new Date()
      if (isNaN(lastModified.getTime())) {
        lastModified = new Date()
      }
    } catch (error) {
      console.error(`[Sitemap] Invalid date for court ${c.name}:`, error)
      lastModified = new Date()
    }

    return {
      url: `${siteUrl}/courts/${slug}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }
  })

  const { data: jurisdictionRows, error: jurisdictionsError } = await supabase
    .from('courts')
    .select('jurisdiction, updated_at')
    .not('jurisdiction', 'is', null)
    .limit(500)

  if (jurisdictionsError) {
    console.error('[Sitemap] Failed to fetch jurisdictions:', jurisdictionsError)
  }

  const jurisdictionSet = new Map<string, Date>()

  ;(jurisdictionRows || []).forEach((row) => {
    if (!row.jurisdiction) return
    const slug = createCanonicalSlug(String(row.jurisdiction))
    if (!slug) return
    const updatedAt = row.updated_at ? new Date(row.updated_at) : new Date()
    const existing = jurisdictionSet.get(slug)
    if (!existing || updatedAt > existing) {
      jurisdictionSet.set(slug, updatedAt)
    }
  })

  const fallbackJurisdictions = [
    'los-angeles-county',
    'orange-county',
    'san-diego-county',
    'san-francisco-county',
    'santa-clara-county',
    'alameda-county',
  ]

  fallbackJurisdictions.forEach((slug) => {
    if (!jurisdictionSet.has(slug)) {
      jurisdictionSet.set(slug, new Date())
    }
  })

  const jurisdictionEntries = Array.from(jurisdictionSet.entries()).map(([slug, updated]) => ({
    url: `${siteUrl}/jurisdictions/${slug}`,
    lastModified: updated,
    changeFrequency: 'monthly' as const,
    priority: 0.55,
  }))

  // Combine all entries
  const allEntries = [
    ...getStaticPages(siteUrl),
    ...judgeEntries,
    ...courtEntries,
    ...jurisdictionEntries,
  ]

  // Validate sitemap doesn't exceed protocol limits
  // Google's sitemap protocol requires max 50,000 URLs per sitemap file
  if (allEntries.length > MAX_SITEMAP_URLS) {
    console.warn(
      `[Sitemap] WARNING: Sitemap contains ${allEntries.length} URLs, exceeding the ` +
        `limit of ${MAX_SITEMAP_URLS}. Switching to segmented sitemaps.`
    )
    // Point crawlers to segmented sitemaps for large sites
    // We return a minimal sitemap that references the index at /public/sitemap-index.xml
    return [
      {
        url: `${siteUrl}/sitemaps/judges`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      },
      {
        url: `${siteUrl}/sitemaps/courts`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      },
      {
        url: `${siteUrl}/sitemaps/jurisdictions`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.55,
      },
    ]
  }

  console.log(`[Sitemap] Generated sitemap with ${allEntries.length} URLs`)

  return allEntries
}

/**
 * Returns static pages that are always included in the sitemap
 * Used as fallback when database connection fails
 */
function getStaticPages(siteUrl: string): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/judges`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/courts`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/jurisdictions`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/analytics`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/docs/methodology`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/docs/governance`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/docs/changelog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.45,
    },
    {
      url: `${siteUrl}/docs/ads-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.45,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${siteUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7, // Important feature
    },
    {
      url: `${siteUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    // Help Center AEO hubs
    {
      url: `${siteUrl}/help-center`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${siteUrl}/help-center/getting-started`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${siteUrl}/help-center/features`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.35,
    },
    {
      url: `${siteUrl}/help-center/troubleshooting`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.35,
    },
    // New AEO Q&A entry points
    {
      url: `${siteUrl}/help-center/how-to-find-my-judge`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.45,
    },
    {
      url: `${siteUrl}/help-center/what-to-expect-la-county-superior-court`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.45,
    },
    {
      url: `${siteUrl}/help-center/compare-judges-in-orange-county`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.45,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ]
}
