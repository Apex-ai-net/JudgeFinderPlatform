import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/search-console-helper'
import { getBaseUrl } from '@/lib/utils/baseUrl'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'How to Find My Judge in California | JudgeFinder Help Center',
  description:
    'Learn how to find your assigned California judge quickly. Use JudgeFinder search, verify jurisdiction, and navigate judge profiles with structured data for accurate legal research.',
  path: '/help-center/how-to-find-my-judge',
  keywords: ['find my judge', 'california judges', 'judge lookup', 'legal research'],
})

function faqStructuredData(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I find my judge in California?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Go to JudgeFinder search, enter your judge’s name or court, then select the profile that matches your jurisdiction (e.g., Los Angeles County). Profiles include structured data for accurate discovery.',
        },
      },
      {
        '@type': 'Question',
        name: 'What if multiple judges have the same name?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Filter by county or court (e.g., Orange County Superior Court). Use profile breadcrumbs and court pages to confirm you have the correct judge.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I search by court instead of name?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Search by court or jurisdiction and browse judges within that court. JudgeFinder supports search by judge, court, and jurisdiction.',
        },
      },
    ],
    url: `${baseUrl}/help-center/how-to-find-my-judge`,
  }
}

export default function HowToFindMyJudgePage(): JSX.Element {
  const baseUrl = getBaseUrl()
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData(baseUrl)) }}
      />
      <h1 className="text-3xl font-bold mb-4">How to find my judge</h1>
      <p className="text-muted-foreground mb-6">
        Use JudgeFinder search to locate your California judge by name, court, or jurisdiction.
        Confirm the county and court match your case.
      </p>
      <ol className="list-decimal pl-6 space-y-2">
        <li>Open Search and type the judge name or court.</li>
        <li>Select the correct jurisdiction (county) from suggestions.</li>
        <li>Open the profile and verify court and jurisdiction in the header and breadcrumbs.</li>
      </ol>
    </section>
  )
}
