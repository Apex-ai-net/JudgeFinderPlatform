import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import ElectionsPageClient from './ElectionsPageClient'
import { ElectionsPageSkeleton } from './ElectionsPageSkeleton'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5 minutes

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'California Judicial Elections Guide | Know Your Judges Before You Vote',
  description:
    'Research judges on your California ballot with comprehensive election information, voting records, and judicial profiles. Find upcoming elections by county and make informed decisions.',
  keywords:
    'california judicial elections, judge elections, ballot judges, judicial retention election, california judge voting, know your judges, judicial election guide, california ballot, judge voting guide, judicial candidates, california superior court elections, judge retention, 2025 judge elections',

  openGraph: {
    title: 'California Judicial Elections Guide | JudgeFinder',
    description:
      'Research judges on your ballot with comprehensive election information and judicial profiles. Make informed decisions in California judicial elections.',
    url: `${BASE_URL}/elections`,
    type: 'website',
    siteName: 'JudgeFinder',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'JudgeFinder - California Judicial Elections Guide',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Know Your Judges Before You Vote | California Elections',
    description: 'Research judicial candidates, view voting records, and learn about upcoming elections.',
    images: ['/twitter-image'],
  },

  alternates: {
    canonical: `${BASE_URL}/elections`,
  },

  robots: {
    index: true,
    follow: true,
  },
}

// Generate structured data for the elections page
function generateElectionsStructuredData(): any {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${BASE_URL}/elections#webpage`,
        url: `${BASE_URL}/elections`,
        name: 'California Judicial Elections Guide',
        description: 'Comprehensive guide to California judicial elections with judge profiles and voting information.',
        isPartOf: {
          '@id': `${BASE_URL}/#website`,
        },
        breadcrumb: {
          '@id': `${BASE_URL}/elections#breadcrumb`,
        },
        inLanguage: 'en-US',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${BASE_URL}/elections#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: BASE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Judicial Elections',
            item: `${BASE_URL}/elections`,
          },
        ],
      },
      {
        '@type': 'Guide',
        name: 'California Judicial Elections Voter Guide',
        description: 'Comprehensive information about judicial elections in California, including candidate profiles, election dates, and voting resources.',
        about: {
          '@type': 'Thing',
          name: 'Judicial Elections',
        },
        audience: {
          '@type': 'Audience',
          audienceType: 'California Voters',
        },
        inLanguage: 'en-US',
        publisher: {
          '@type': 'Organization',
          name: 'JudgeFinder',
          url: BASE_URL,
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How do judicial elections work in California?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'California uses different methods for selecting judges depending on the court level. Superior Court judges are elected by voters in nonpartisan elections, while appellate and Supreme Court justices are appointed by the Governor and subject to retention elections.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is a judicial retention election?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'In retention elections, voters answer yes or no to whether a judge should remain in office. There are no opposing candidates. If a majority votes "no," the position becomes vacant and a new appointment is made.',
            },
          },
          {
            '@type': 'Question',
            name: 'Are California judicial elections partisan?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Superior Court judicial elections are nonpartisan, meaning candidates\' political party affiliations are not listed on the ballot. This is designed to promote judicial independence and impartiality.',
            },
          },
        ],
      },
    ],
  }
}

export default function ElectionsPage(): JSX.Element {
  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateElectionsStructuredData()),
        }}
      />

      {/* Main Elections Content */}
      <Suspense fallback={<ElectionsPageSkeleton />}>
        <ElectionsPageClient />
      </Suspense>
    </>
  )
}
