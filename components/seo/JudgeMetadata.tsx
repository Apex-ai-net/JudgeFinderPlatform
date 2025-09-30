/**
 * JudgeMetadata - Comprehensive SEO & AEO metadata for judge pages
 *
 * Generates OpenGraph, Twitter Cards, and meta tags optimized for:
 * - Google Search (traditional SEO)
 * - Social media sharing
 * - Answer Engine Optimization (ChatGPT, Claude, Perplexity)
 *
 * Key AEO Strategies:
 * - Include "2025" in titles for recency signals
 * - 40-60 word descriptions (LLM-optimal length)
 * - Clear, conversational language
 * - Direct answers to common questions
 */

import { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils/baseUrl'

interface Judge {
  id: string
  name: string
  slug: string
  court_name: string | null
  court_id: string | null
  jurisdiction: string
  appointed_date: string | null
  position: string | null
  bio: string | null
}

interface GenerateJudgeMetadataProps {
  judge: Judge
  caseCount?: number
  avgDecisionTime?: string | null
}

export function generateJudgeMetadata({
  judge,
  caseCount = 0,
  avgDecisionTime = null,
}: GenerateJudgeMetadataProps): Metadata {
  const baseUrl = getBaseUrl()
  const judgeUrl = `${baseUrl}/judges/${judge.slug}`

  // Title optimized for SEO & AEO (includes 2025 for recency)
  const title = `${judge.name} - ${judge.position || 'California Judge'} | JudgeFinder 2025`

  // Description: 40-60 words optimized for LLM extraction
  const description =
    judge.bio ||
    `${judge.name} serves as ${judge.position || 'a judge'} at ${judge.court_name || 'California courts'} in ${judge.jurisdiction}. View comprehensive judicial profile including ${caseCount > 0 ? `${caseCount} cases, ` : ''}analytics, bias patterns, and case outcomes. Updated 2025.`

  // Keywords for traditional SEO
  const keywords = [
    judge.name,
    `Judge ${judge.name}`,
    judge.court_name,
    judge.jurisdiction,
    'California judge',
    'judicial profile',
    'court records',
    'case analytics',
    judge.position,
    '2025',
  ]
    .filter(Boolean)
    .join(', ')

  return {
    title,
    description,
    keywords,
    authors: [{ name: 'JudgeFinder' }],
    creator: 'JudgeFinder',
    publisher: 'JudgeFinder',
    alternates: {
      canonical: judgeUrl,
    },
    openGraph: {
      type: 'profile',
      url: judgeUrl,
      title,
      description,
      siteName: 'JudgeFinder',
      locale: 'en_US',
      images: [
        {
          url: `${baseUrl}/api/og?title=${encodeURIComponent(judge.name)}&subtitle=${encodeURIComponent(judge.court_name || 'California Courts')}`,
          width: 1200,
          height: 630,
          alt: `${judge.name} - California Judge Profile`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        `${baseUrl}/api/og?title=${encodeURIComponent(judge.name)}&subtitle=${encodeURIComponent(judge.court_name || 'California Courts')}`,
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      // Additional metadata for rich results
      'profile:first_name': judge.name.split(' ')[0],
      'profile:last_name': judge.name.split(' ').slice(1).join(' '),
      'profile:username': judge.slug,
      // AEO-specific hints
      'article:published_time': judge.appointed_date || new Date().toISOString(),
      'article:modified_time': new Date().toISOString(),
      'article:section': 'Judicial Profiles',
      'article:tag': keywords,
    },
  }
}