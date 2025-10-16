import { Metadata } from 'next'
import HomeHero from '@/components/home/HomeHero'
import NextDynamic from 'next/dynamic'
import { HomepageFAQ } from '@/components/seo/HomepageFAQ'
import { getBaseUrl } from '@/lib/utils/baseUrl'

export const dynamic = 'force-dynamic'
export const revalidate = 300

const BASE_URL = getBaseUrl()

// Server-side metadata generation for SEO & AEO (2025)
export const metadata: Metadata = {
  title: 'JudgeFinder.io – California Judicial Research',
  description:
    'Research California judges with analytics, ruling patterns, and court information. Free statewide data for attorneys and citizens.',
  keywords:
    'california judges, find my judge, court appearance preparation, judicial analytics, judge patterns, california courts, legal research, judge profiles, court analytics, judicial transparency, california superior court judges, judge ruling patterns, legal intelligence, court preparation, judge information, california judicial directory, court case research, judge decision history, legal transparency platform, free judge lookup, 2025',

  openGraph: {
    title: 'JudgeFinder.io – California Judicial Research',
    description:
      'Access California judge profiles with analytics, ruling patterns, and case outcomes. Free for attorneys and citizens.',
    type: 'website',
    url: BASE_URL,
    siteName: 'JudgeFinder.io',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'JudgeFinder - California Judicial Analytics Platform',
      },
    ],
    locale: 'en_US',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Find Your California Judge – Free Judicial Research',
    description:
      'Research California judges with analytics, judicial insights, and case outcomes. Free access.',
    images: ['/twitter-image'],
    creator: '@judgefinder',
    site: '@judgefinder',
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

  alternates: {
    canonical: BASE_URL,
  },

  // Search engine verification (configured via environment variables)
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
    yandex: process.env.YANDEX_VERIFICATION || '',
    other: {
      'msvalidate.01': process.env.BING_SITE_VERIFICATION || '',
    },
  },

  other: {
    'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION || '',
    'msvalidate.01': process.env.BING_SITE_VERIFICATION || '',
    'yandex-verification': process.env.YANDEX_VERIFICATION || '',
    'fb:app_id': process.env.FB_APP_ID || '',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'format-detection': 'telephone=no',
  },
}

// Generate comprehensive structured data for homepage, including Dataset JSON-LD
function generateHomepageStructuredData(): any {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: 'JudgeFinder.io',
        description: "California's judicial analytics and transparency platform",
        publisher: {
          '@id': `${BASE_URL}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/judges?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
        inLanguage: 'en-US',
      },
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'JudgeFinder',
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/logo.png`,
          width: 600,
          height: 60,
        },
        description: 'Leading platform for judicial transparency and legal analytics in California',
        sameAs: ['https://twitter.com/judgefinder', 'https://linkedin.com/company/judgefinder'],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@judgefinder.io',
          availableLanguage: 'English',
        },
      },
      {
        '@type': 'WebApplication',
        name: 'JudgeFinder Legal Research Platform',
        url: BASE_URL,
        applicationCategory: 'Legal Research',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free access to judicial analytics and court data',
        },
        featureList: [
          'Comprehensive California Judge Profiles',
          'Data-Driven Pattern Analysis',
          'Real-time Case Analytics',
          'Extensive Court Decision Library',
          'Ruling Pattern Analysis',
          'Free Anonymous Access',
        ],
      },
      {
        '@type': 'Service',
        name: 'Judicial Analytics Service',
        provider: {
          '@id': `${BASE_URL}/#organization`,
        },
        serviceType: 'Legal Research and Analytics',
        areaServed: {
          '@type': 'State',
          name: 'California',
          containedInPlace: {
            '@type': 'Country',
            name: 'United States',
          },
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Legal Research Services',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Judge Profile Research',
                description: 'Comprehensive judicial profiles with analytics',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Judicial Pattern Analysis',
                description: 'Data-driven judicial tendency detection',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Case Outcome Analytics',
                description: 'Historical case outcome analysis and patterns',
              },
            },
          ],
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${BASE_URL}/#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: BASE_URL,
          },
        ],
      },
      {
        '@type': 'Dataset',
        name: 'JudgeFinder California Judicial Dataset',
        description:
          'Comprehensive California judicial dataset covering judges, courts, and case analytics for transparency and research.',
        url: BASE_URL,
        spatialCoverage: {
          '@type': 'State',
          name: 'California',
        },
        temporalCoverage: `${new Date().getFullYear() - 10}/${new Date().getFullYear()}`,
        creator: {
          '@type': 'Organization',
          name: 'JudgeFinder',
        },
        publisher: {
          '@type': 'Organization',
          name: 'JudgeFinder',
        },
        isAccessibleForFree: true,
        distribution: {
          '@type': 'DataDownload',
          contentUrl: BASE_URL,
          encodingFormat: 'text/html',
        },
        keywords: [
          'California judges',
          'judicial analytics',
          'court data',
          'case outcomes',
          'judicial transparency',
        ],
      },
    ],
  }
}

export default function HomePage(): JSX.Element {
  return (
    <>
      {/* Comprehensive Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateHomepageStructuredData()),
        }}
      />

      {/* Main Homepage Content */}
      <HomeHero />
      <LazyHomeEnhancements />

      {/* FAQ Section with Schema Markup */}
      <HomepageFAQ />
    </>
  )
}

const LazyHomeEnhancements = NextDynamic(() => import('@/components/home/HomeEnhancements'), {
  loading: () => null,
})
