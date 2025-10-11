import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/search-console-helper'
import { getBaseUrl } from '@/lib/utils/baseUrl'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'Compare Judges in Orange County | JudgeFinder Help Center',
  description:
    'Learn how to compare Orange County judges side-by-side using JudgeFinder. Understand profiles, analytics, and court context for data-driven preparation.',
  path: '/help-center/compare-judges-in-orange-county',
  keywords: ['compare judges', 'Orange County judges', 'judicial analytics'],
})

function faqStructuredData(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${baseUrl}/help-center/compare-judges-in-orange-county`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I compare judges in Orange County?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use the Compare feature on JudgeFinder to select up to three judges and view their profiles side-by-side, including analytics and background information.',
        },
      },
      {
        '@type': 'Question',
        name: 'What does the comparison include?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'It includes high-level analytics, background, and court context to aid legal research. Data is presented objectively and avoids conclusions beyond available evidence.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I compare across jurisdictions?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'JudgeFinder focuses on California. For best accuracy, compare judges within the same jurisdiction (e.g., Orange County Superior Court).',
        },
      },
    ],
  }
}

export default function CompareOCJudgesPage(): JSX.Element {
  const baseUrl = getBaseUrl()
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData(baseUrl)) }}
      />
      <h1 className="text-3xl font-bold mb-4">Compare judges in Orange County</h1>
      <p className="text-muted-foreground mb-6">
        Use JudgeFinder’s compare tool to view Orange County judges side-by-side.
      </p>
      <ol className="list-decimal pl-6 space-y-2">
        <li>Open Compare and add judges by name or from profiles.</li>
        <li>Verify jurisdiction and court for each selection.</li>
        <li>Review analytics and background for high-level insights.</li>
      </ol>
    </section>
  )
}
