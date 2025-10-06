import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils/baseUrl'

const baseUrl = getBaseUrl()

export const compareMetadata: Metadata = {
  title: 'Compare California Judges | Side-by-Side Judicial Analytics | JudgeFinder',
  description: 'Compare up to 3 California judges side-by-side with comprehensive analytics. Analyze decision patterns, consistency scores, ruling tendencies, and professional backgrounds for informed legal strategy.',
  keywords: [
    'compare judges',
    'judicial comparison',
    'california judges comparison',
    'judge analytics comparison',
    'side by side judge analysis',
    'judicial decision patterns',
    'california court comparison',
    'judge consistency scores',
    'legal research tool',
    'judicial analytics'
  ].join(', '),
  alternates: {
    canonical: `${baseUrl}/compare`,
  },
  openGraph: {
    title: 'Judge Comparison Tool | JudgeFinder',
    description: 'Compare judicial analytics, decision patterns, and backgrounds for California judges. Data-driven insights for legal professionals and litigants.',
    url: `${baseUrl}/compare`,
    siteName: 'JudgeFinder',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'JudgeFinder Judge Comparison Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compare California Judges | JudgeFinder',
    description: 'Side-by-side judicial analytics and comparison tools for California courts',
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
