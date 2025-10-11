import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/search-console-helper'

export const aboutMetadata: Metadata = buildPageMetadata({
  title: 'About JudgeFinder | California Judicial Transparency Platform',
  description:
    'Learn about JudgeFinder mission to promote judicial transparency through AI-powered analytics. Free access to California judge profiles, court data, and comprehensive legal research tools for citizens, attorneys, and litigants.',
  path: '/about',
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
    'court transparency',
  ],
})
