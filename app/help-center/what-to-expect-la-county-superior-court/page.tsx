import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/search-console-helper'
import { getBaseUrl } from '@/lib/utils/baseUrl'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'What to Expect in Los Angeles County Superior Court | JudgeFinder Help Center',
  description:
    'Learn what to expect in LA County Superior Court: appearance logistics, case types, and how to research your judge using JudgeFinder. Short, factual guidance for litigants and attorneys.',
  path: '/help-center/what-to-expect-la-county-superior-court',
  keywords: ['Los Angeles County Superior Court', 'court expectations', 'California courts'],
})

function faqStructuredData(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${baseUrl}/help-center/what-to-expect-la-county-superior-court`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What should I bring to LA County Superior Court?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bring any required filings, identification, and case materials. Plan to arrive early for security and check-in. Verify location and department on your notice.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can JudgeFinder help me prepare?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use JudgeFinder to review your judge’s profile, court, and jurisdiction. Profiles include analytics and public information to understand general tendencies.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where is official information found?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Visit the official LA County Superior Court website for schedules, locations, and procedures. JudgeFinder complements, but does not replace, official sources.',
        },
      },
    ],
  }
}

export default function LAExpectationsPage(): JSX.Element {
  const baseUrl = getBaseUrl()
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData(baseUrl)) }}
      />
      <h1 className="text-3xl font-bold mb-4">
        What to expect in Los Angeles County Superior Court
      </h1>
      <p className="text-muted-foreground mb-6">
        Practical guidance for attending LA County Superior Court and using JudgeFinder to prepare.
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Confirm your department and time on official notices.</li>
        <li>Arrive early for security screening and check-in.</li>
        <li>Review your judge’s profile for high-level insights.</li>
      </ul>
    </section>
  )
}
