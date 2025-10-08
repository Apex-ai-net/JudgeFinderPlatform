/**
 * Search Console Integration Helper
 *
 * Utility functions for SEO metadata validation, sitemap generation scripts,
 * and structured data testing. Used for maintaining SEO compliance and
 * facilitating search engine verification.
 */

import type { Metadata } from 'next'

/**
 * SEO Metadata Types
 */
export interface SEOMetadata {
  title: string
  description: string
  canonical?: string
  keywords?: string
  ogImage?: string
  ogType?: string
  twitterCard?: string
  noindex?: boolean
  nofollow?: boolean
}

/**
 * Structured Data Validation Result
 */
export interface StructuredDataValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  schemaTypes: string[]
}

/**
 * Sitemap URL Entry
 */
export interface SitemapEntry {
  url: string
  lastModified?: Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

/**
 * Validates SEO metadata for completeness and best practices
 *
 * @param metadata - SEO metadata object to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const validation = validateSEOMetadata({
 *   title: 'Judge John Doe - JudgeFinder',
 *   description: 'Profile for Judge John Doe...',
 *   canonical: 'https://judgefinder.io/judges/john-doe'
 * })
 *
 * if (!validation.valid) {
 *   console.error('SEO issues:', validation.errors)
 * }
 * ```
 */
export function validateSEOMetadata(metadata: SEOMetadata): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Title validation
  if (!metadata.title) {
    errors.push('Title is required')
  } else {
    if (metadata.title.length < 30) {
      warnings.push(`Title is too short (${metadata.title.length} chars). Recommended: 50-60 characters`)
    }
    if (metadata.title.length > 60) {
      warnings.push(`Title is too long (${metadata.title.length} chars). May be truncated in search results`)
    }
  }

  // Description validation
  if (!metadata.description) {
    errors.push('Description is required')
  } else {
    if (metadata.description.length < 120) {
      warnings.push(`Description is too short (${metadata.description.length} chars). Recommended: 150-160 characters`)
    }
    if (metadata.description.length > 160) {
      warnings.push(`Description is too long (${metadata.description.length} chars). May be truncated in search results`)
    }
  }

  // Canonical URL validation
  if (metadata.canonical) {
    try {
      new URL(metadata.canonical)
    } catch (error) {
      errors.push('Canonical URL is not a valid URL')
    }
  }

  // Keywords validation (optional but check if present)
  if (metadata.keywords) {
    const keywordCount = metadata.keywords.split(',').length
    if (keywordCount > 10) {
      warnings.push(`Too many keywords (${keywordCount}). Recommended: 5-10 targeted keywords`)
    }
  }

  // Open Graph validation
  if (!metadata.ogImage) {
    warnings.push('Open Graph image is missing. Recommended for social sharing')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates structured data (JSON-LD) for schema.org compliance
 *
 * @param structuredData - JSON-LD structured data object or array
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const validation = validateStructuredData({
 *   '@context': 'https://schema.org',
 *   '@type': 'Person',
 *   name: 'Judge John Doe'
 * })
 * ```
 */
export function validateStructuredData(structuredData: any): StructuredDataValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const schemaTypes: string[] = []

  // Handle both single object and array of objects
  const dataArray = Array.isArray(structuredData) ? structuredData : [structuredData]

  dataArray.forEach((data, index) => {
    const prefix = dataArray.length > 1 ? `[${index}] ` : ''

    // Check for @context
    if (!data['@context']) {
      errors.push(`${prefix}Missing @context property`)
    } else if (!data['@context'].includes('schema.org')) {
      warnings.push(`${prefix}@context should reference schema.org`)
    }

    // Check for @type
    if (!data['@type']) {
      errors.push(`${prefix}Missing @type property`)
    } else {
      const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]
      schemaTypes.push(...types)

      // Validate common required properties based on type
      types.forEach((type: string) => {
        if (type === 'Person' && !data.name) {
          errors.push(`${prefix}Person type requires 'name' property`)
        }
        if (type === 'Organization' && !data.name) {
          errors.push(`${prefix}Organization type requires 'name' property`)
        }
        if (type === 'WebPage' && !data.url) {
          warnings.push(`${prefix}WebPage type should have 'url' property`)
        }
      })
    }

    // Check for valid JSON structure
    try {
      JSON.stringify(data)
    } catch (error) {
      errors.push(`${prefix}Invalid JSON structure: ${error}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaTypes: [...new Set(schemaTypes)],
  }
}

/**
 * Generates a script for programmatically submitting sitemap to Google Search Console
 * This is a helper for documentation/automation purposes
 *
 * @param siteUrl - Base URL of the site
 * @returns Bash script for sitemap submission
 *
 * @example
 * ```typescript
 * const script = generateSitemapSubmissionScript('https://judgefinder.io')
 * console.log(script)
 * ```
 */
export function generateSitemapSubmissionScript(siteUrl: string): string {
  const sitemapUrl = `${siteUrl}/sitemap.xml`

  return `#!/bin/bash
# Sitemap Submission Script for ${siteUrl}
# Generated by JudgeFinder SEO Helper

# Colors for output
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m' # No Color

echo "🗺️  Sitemap Submission Helper"
echo "=============================="
echo ""

# Validate sitemap is accessible
echo "Checking sitemap accessibility..."
SITEMAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${sitemapUrl}")

if [ "$SITEMAP_STATUS" -eq 200 ]; then
  echo -e "\${GREEN}✓\${NC} Sitemap is accessible: ${sitemapUrl}"
else
  echo -e "\${RED}✗\${NC} Sitemap returned HTTP $SITEMAP_STATUS"
  exit 1
fi

# Ping Google
echo ""
echo "Submitting to Google..."
GOOGLE_PING="http://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}"
GOOGLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GOOGLE_PING")

if [ "$GOOGLE_STATUS" -eq 200 ]; then
  echo -e "\${GREEN}✓\${NC} Successfully pinged Google Search Console"
else
  echo -e "\${YELLOW}⚠\${NC} Google ping returned HTTP $GOOGLE_STATUS"
fi

# Ping Bing
echo ""
echo "Submitting to Bing..."
BING_PING="http://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}"
BING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BING_PING")

if [ "$BING_STATUS" -eq 200 ]; then
  echo -e "\${GREEN}✓\${NC} Successfully pinged Bing Webmaster Tools"
else
  echo -e "\${YELLOW}⚠\${NC} Bing ping returned HTTP $BING_STATUS"
fi

echo ""
echo "=============================="
echo -e "\${GREEN}✓\${NC} Sitemap submission complete!"
echo ""
echo "Next steps:"
echo "1. Verify in Google Search Console: https://search.google.com/search-console"
echo "2. Verify in Bing Webmaster Tools: https://www.bing.com/webmasters"
echo "3. Check indexing status in 24-48 hours"
`
}

/**
 * Validates sitemap entry for protocol compliance
 *
 * @param entry - Sitemap entry to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const validation = validateSitemapEntry({
 *   url: 'https://judgefinder.io/judges/john-doe',
 *   lastModified: new Date(),
 *   priority: 0.8
 * })
 * ```
 */
export function validateSitemapEntry(entry: SitemapEntry): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // URL validation
  if (!entry.url) {
    errors.push('URL is required')
  } else {
    try {
      const url = new URL(entry.url)

      // Check protocol
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol')
      }

      // Check URL length (recommended max 2048 characters)
      if (entry.url.length > 2048) {
        warnings.push('URL exceeds recommended length of 2048 characters')
      }
    } catch (error) {
      errors.push('Invalid URL format')
    }
  }

  // Priority validation
  if (entry.priority !== undefined) {
    if (entry.priority < 0 || entry.priority > 1) {
      errors.push('Priority must be between 0.0 and 1.0')
    }
  }

  // Change frequency validation
  const validFrequencies = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
  if (entry.changeFrequency && !validFrequencies.includes(entry.changeFrequency)) {
    errors.push(`Invalid changeFrequency. Must be one of: ${validFrequencies.join(', ')}`)
  }

  // Last modified validation
  if (entry.lastModified) {
    const date = new Date(entry.lastModified)
    if (isNaN(date.getTime())) {
      errors.push('Invalid lastModified date')
    } else if (date > new Date()) {
      warnings.push('lastModified date is in the future')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Generates robots.txt directives for testing
 *
 * @param siteUrl - Base URL of the site
 * @param options - Configuration options
 * @returns robots.txt content
 *
 * @example
 * ```typescript
 * const robots = generateRobotsTxt('https://judgefinder.io', {
 *   allowAll: true,
 *   includeSitemap: true
 * })
 * ```
 */
export function generateRobotsTxt(
  siteUrl: string,
  options: {
    allowAll?: boolean
    disallowPaths?: string[]
    crawlDelay?: number
    includeSitemap?: boolean
  } = {}
): string {
  const {
    allowAll = true,
    disallowPaths = [],
    crawlDelay,
    includeSitemap = true,
  } = options

  let content = '# JudgeFinder.io - Robots.txt\n\n'
  content += 'User-agent: *\n'

  if (allowAll) {
    content += 'Allow: /\n'
  }

  if (disallowPaths.length > 0) {
    content += '\n# Disallowed paths\n'
    disallowPaths.forEach(path => {
      content += `Disallow: ${path}\n`
    })
  }

  if (crawlDelay) {
    content += `\nCrawl-delay: ${crawlDelay}\n`
  }

  if (includeSitemap) {
    content += `\n# Sitemap\nSitemap: ${siteUrl}/sitemap.xml\n`
  }

  return content
}

/**
 * Creates SEO-optimized metadata for Next.js pages
 *
 * @param params - Metadata parameters
 * @returns Next.js Metadata object
 *
 * @example
 * ```typescript
 * export const metadata = createSEOMetadata({
 *   title: 'Judge John Doe',
 *   description: 'Judicial profile and analytics',
 *   path: '/judges/john-doe',
 *   baseUrl: 'https://judgefinder.io'
 * })
 * ```
 */
export function createSEOMetadata(params: {
  title: string
  description: string
  path: string
  baseUrl: string
  keywords?: string[]
  ogImage?: string
  noindex?: boolean
}): Metadata {
  const {
    title,
    description,
    path,
    baseUrl,
    keywords = [],
    ogImage = '/og-image.png',
    noindex = false,
  } = params

  const canonicalUrl = `${baseUrl}${path}`

  return {
    title,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'JudgeFinder.io',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
  }
}

/**
 * Analyzes page content for SEO issues
 * This is a client-side utility for development/testing
 *
 * @param html - HTML content to analyze
 * @returns SEO analysis report
 */
export function analyzeSEOIssues(html: string): {
  score: number
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100

  // Check for title tag
  if (!html.includes('<title>')) {
    issues.push('Missing <title> tag')
    score -= 20
  }

  // Check for meta description
  if (!html.includes('name="description"')) {
    issues.push('Missing meta description')
    score -= 15
  }

  // Check for H1 tag
  const h1Count = (html.match(/<h1/g) || []).length
  if (h1Count === 0) {
    issues.push('Missing H1 heading')
    score -= 10
  } else if (h1Count > 1) {
    issues.push('Multiple H1 headings detected (should have exactly one)')
    score -= 5
  }

  // Check for alt attributes on images
  const imgTags = (html.match(/<img/g) || []).length
  const imgWithAlt = (html.match(/<img[^>]+alt=/g) || []).length
  if (imgTags > 0 && imgWithAlt < imgTags) {
    suggestions.push(`${imgTags - imgWithAlt} images missing alt attributes`)
    score -= 5
  }

  // Check for canonical URL
  if (!html.includes('rel="canonical"')) {
    suggestions.push('Consider adding canonical URL')
    score -= 5
  }

  // Check for viewport meta tag
  if (!html.includes('name="viewport"')) {
    issues.push('Missing viewport meta tag (required for mobile)')
    score -= 10
  }

  // Check for lang attribute
  if (!html.includes('lang=')) {
    suggestions.push('Add lang attribute to <html> tag')
    score -= 3
  }

  // Check for structured data
  if (!html.includes('application/ld+json')) {
    suggestions.push('Consider adding structured data (JSON-LD)')
  }

  return {
    score: Math.max(0, score),
    issues,
    suggestions,
  }
}

/**
 * Formats a date for sitemap XML (W3C format)
 *
 * @param date - Date to format
 * @returns ISO 8601 formatted date string
 *
 * @example
 * ```typescript
 * const formatted = formatSitemapDate(new Date())
 * // Output: "2025-10-08T12:34:56.789Z"
 * ```
 */
export function formatSitemapDate(date: Date): string {
  return date.toISOString()
}

/**
 * Calculates dynamic priority for sitemap entries based on multiple factors
 *
 * @param params - Priority calculation parameters
 * @returns Priority value between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * const priority = calculateDynamicPriority({
 *   baselinePriority: 0.7,
 *   pageViews: 1000,
 *   lastModified: new Date('2025-10-01'),
 *   contentLength: 5000
 * })
 * ```
 */
export function calculateDynamicPriority(params: {
  baselinePriority: number
  pageViews?: number
  lastModified?: Date
  contentLength?: number
  inboundLinks?: number
}): number {
  const {
    baselinePriority,
    pageViews = 0,
    lastModified,
    contentLength = 0,
    inboundLinks = 0,
  } = params

  let priority = baselinePriority

  // Boost for page views (up to +0.1)
  if (pageViews > 0) {
    const viewBoost = Math.min(0.1, (pageViews / 10000) * 0.1)
    priority += viewBoost
  }

  // Boost for recent updates (up to +0.05)
  if (lastModified) {
    const daysSinceUpdate = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate < 30) {
      priority += 0.05
    } else if (daysSinceUpdate < 90) {
      priority += 0.02
    }
  }

  // Boost for substantial content (up to +0.05)
  if (contentLength > 2000) {
    priority += 0.05
  } else if (contentLength > 1000) {
    priority += 0.02
  }

  // Boost for inbound links (up to +0.1)
  if (inboundLinks > 0) {
    const linkBoost = Math.min(0.1, (inboundLinks / 50) * 0.1)
    priority += linkBoost
  }

  // Ensure priority stays within valid range
  return Math.min(1.0, Math.max(0.0, Number(priority.toFixed(2))))
}
