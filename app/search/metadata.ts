import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils/baseUrl'

const baseUrl = getBaseUrl()

export const searchMetadata: Metadata = {
  title: 'Search California Judges & Courts | Advanced Legal Research | JudgeFinder',
  description: 'Search California judges, courts, and jurisdictions with advanced filters. Find judicial profiles, court information, and comprehensive legal research data. Real-time results across California statewide coverage.',
  keywords: [
    'search judges',
    'find california judge',
    'court search',
    'jurisdiction search',
    'legal research',
    'california judicial search',
    'judge lookup',
    'court finder',
    'judicial directory search',
    'california courts database'
  ].join(', '),
  alternates: {
    canonical: `${baseUrl}/search`,
  },
  openGraph: {
    title: 'Search California Judges & Courts | JudgeFinder',
    description: 'Advanced search for California judges, courts, and jurisdictions. Real-time results with comprehensive judicial and court data.',
    url: `${baseUrl}/search`,
    siteName: 'JudgeFinder',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'JudgeFinder Search Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search California Judges & Courts | JudgeFinder',
    description: 'Advanced legal research search tool for California judicial system',
    images: [`${baseUrl}/twitter-image.png`],
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
}
