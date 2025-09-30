/**
 * JudgeStructuredData - JSON-LD Schema.org markup for judge profiles
 *
 * This component generates comprehensive structured data for judge pages,
 * optimizing for both traditional SEO and Answer Engine Optimization (AEO).
 *
 * Schema Types Used:
 * - Person: Individual judge information
 * - BreadcrumbList: Navigation context
 * - FAQPage: Common questions about the judge
 * - Organization: Court information
 *
 * AEO Benefits:
 * - Enables ChatGPT, Claude, and Perplexity to accurately reference judges
 * - Improves Google rich snippets and knowledge panels
 * - Provides clear entity relationships for LLMs
 */

import { getBaseUrl } from '@/lib/utils/baseUrl'

interface Judge {
  id: string
  name: string
  slug: string
  court_name: string | null
  court_id: string | null
  jurisdiction: string
  appointed_date: string | null
  position: string | null
  bio: string | null
  education: string | null
}

interface JudgeStructuredDataProps {
  judge: Judge
  caseCount?: number
  avgDecisionTime?: string | null
  courtAddress?: string | null
}

export function JudgeStructuredData({
  judge,
  caseCount = 0,
  avgDecisionTime = null,
  courtAddress = null,
}: JudgeStructuredDataProps) {
  const baseUrl = getBaseUrl()
  const judgeUrl = `${baseUrl}/judges/${judge.slug}`

  // Person Schema - Core judge information
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': judgeUrl,
    name: judge.name,
    jobTitle: judge.position || 'Judge',
    worksFor: {
      '@type': 'Organization',
      name: judge.court_name || 'California Courts',
      ...(courtAddress && { address: courtAddress }),
    },
    description: judge.bio || `${judge.name} is a ${judge.position || 'judge'} serving in ${judge.court_name || 'California courts'}. View comprehensive profile, case statistics, and judicial analytics.`,
    ...(judge.education && { alumniOf: judge.education }),
    ...(judge.appointed_date && {
      award: `Appointed ${new Date(judge.appointed_date).getFullYear()}`
    }),
    url: judgeUrl,
    sameAs: [judgeUrl],
    knowsAbout: [
      'California Law',
      'Judicial Proceedings',
      'Legal System',
      judge.court_name,
    ].filter(Boolean),
  }

  // BreadcrumbList Schema - Navigation context for search engines
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'California Judges',
        item: `${baseUrl}/judges`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: judge.name,
        item: judgeUrl,
      },
    ],
  }

  // FAQPage Schema - AEO optimization for question answering
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Who is ${judge.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${judge.name} is ${judge.position || 'a judge'} serving in ${judge.court_name || 'California courts'}. ${judge.name} presides over legal proceedings and makes judicial decisions in ${judge.jurisdiction}.`,
        },
      },
      {
        '@type': 'Question',
        name: `What court does ${judge.name} work at?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${judge.name} currently serves at ${judge.court_name || 'California courts'} in ${judge.jurisdiction}.`,
        },
      },
      ...(caseCount > 0
        ? [
            {
              '@type': 'Question',
              name: `How many cases has ${judge.name} handled?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `${judge.name} has ${caseCount} documented cases in the JudgeFinder database${avgDecisionTime ? ` with an average decision time of ${avgDecisionTime}` : ''}.`,
              },
            },
          ]
        : []),
      {
        '@type': 'Question',
        name: `How can I find more information about ${judge.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Visit ${judgeUrl} for comprehensive information including case statistics, judicial analytics, bias patterns, and recent decisions by ${judge.name}.`,
        },
      },
    ],
  }

  // Organization Schema - Court information
  const organizationSchema = judge.court_name
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${baseUrl}/courts/${judge.court_id}`,
        name: judge.court_name,
        ...(courtAddress && {
          address: {
            '@type': 'PostalAddress',
            addressRegion: judge.jurisdiction,
            addressCountry: 'US',
          },
        }),
        employee: {
          '@type': 'Person',
          name: judge.name,
          jobTitle: judge.position || 'Judge',
        },
      }
    : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {organizationSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      )}
    </>
  )
}