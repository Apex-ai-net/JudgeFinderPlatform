import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/search-console-helper'

export const compareMetadata: Metadata = buildPageMetadata({
  title: 'Compare California Judges | Side-by-Side Judicial Analytics | JudgeFinder',
  description:
    'Compare up to 3 California judges side-by-side with comprehensive analytics. Analyze decision patterns, consistency scores, ruling tendencies, and professional backgrounds for informed legal strategy.',
  path: '/compare',
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
    'judicial analytics',
  ],
})
