import type { Metadata } from 'next'
import { HelpPageClient } from './HelpPageClient'
import { getBaseUrl } from '@/lib/utils/baseUrl'

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Help & FAQ | JudgeFinder',
  description:
    'Get answers to frequently asked questions about JudgeFinder. Learn how to search for judges, understand our AI bias analysis, and get support.',
  keywords:
    'JudgeFinder help, FAQ, frequently asked questions, support, judge search help, how to use JudgeFinder',
  alternates: {
    canonical: `${BASE_URL}/help`,
  },
  openGraph: {
    title: 'Help & FAQ | JudgeFinder',
    description:
      'Find answers to common questions and get the support you need for using JudgeFinder.',
    url: `${BASE_URL}/help`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help & FAQ | JudgeFinder',
    description: 'Get help and find answers to frequently asked questions about JudgeFinder.',
  },
}

export default function HelpPage(): JSX.Element {
  return <HelpPageClient />
}
