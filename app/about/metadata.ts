import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils/baseUrl'

const baseUrl = getBaseUrl()

export const aboutMetadata: Metadata = {
  title: 'About JudgeFinder | California Judicial Transparency Platform',
  description: 'Learn about JudgeFinder mission to promote judicial transparency through AI-powered analytics. Free access to California judge profiles, court data, and comprehensive legal research tools for citizens, attorneys, and litigants.',
  keywords: [
    'about judgefinder',
    'judicial transparency',
    'california courts',
    'legal research platform',
    'judge analytics',
    'ai-powered judicial analysis',
    'free legal research',
    'judicial accountability',
    'california legal system',
    'court transparency'
  ].join(', '),
  alternates: {
    canonical: `${baseUrl}/about`,
  },
  openGraph: {
    title: 'About JudgeFinder | Judicial Transparency Mission',
    description: 'Promoting judicial transparency through comprehensive data and AI-powered analytics. Free platform for California legal research and judicial insights.',
    url: `${baseUrl}/about`,
    siteName: 'JudgeFinder',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'JudgeFinder - California Judicial Transparency Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About JudgeFinder | Judicial Transparency',
    description: 'Free AI-powered judicial analytics and transparency platform for California',
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
