import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/search-console-helper'

export const searchMetadata: Metadata = buildPageMetadata({
  title: 'Search California Judges & Courts | Advanced Legal Research | JudgeFinder',
  description:
    'Search California judges, courts, and jurisdictions with advanced filters. Find judicial profiles, court information, and comprehensive legal research data. Real-time results across California statewide coverage.',
  path: '/search',
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
    'california courts database',
  ],
})
