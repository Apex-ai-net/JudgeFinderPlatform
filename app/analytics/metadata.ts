import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils/baseUrl'

const baseUrl = getBaseUrl()

export const analyticsMetadata: Metadata = {
  title: 'Platform Analytics | JudgeFinder Data Coverage & Statistics',
  description: 'Comprehensive analytics and data coverage metrics for California judicial platform. View judge coverage, court statistics, data freshness indicators, and platform operational metrics.',
  keywords: [
    'judicial analytics',
    'platform statistics',
    'court data coverage',
    'california judge data',
    'data freshness metrics',
    'judicial database statistics',
    'california courts coverage',
    'legal data analytics',
    'platform metrics',
    'judicial transparency data'
  ].join(', '),
  alternates: {
    canonical: `${baseUrl}/analytics`,
  },
  openGraph: {
    title: 'Platform Analytics | JudgeFinder Data Coverage',
    description: 'Real-time data coverage and operational metrics for California judicial transparency platform',
    url: `${baseUrl}/analytics`,
    siteName: 'JudgeFinder',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'JudgeFinder Platform Analytics',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Platform Analytics | JudgeFinder',
    description: 'Comprehensive California judicial data coverage and statistics',
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
