import type { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/utils/baseUrl'

const DEFAULT_DISALLOWED_PATHS = [
  '/api/',
  '/admin/',
  '/dashboard/',
  '/_next/',
  '/attorney-setup/',
  '/success/',
  '/private/',
  '/profile/',
  '/settings/',
  '/sign-in/',
  '/sign-up/',
  '/login/',
  '/signup/',
  '/forgot-password/',
  '/welcome/',
]

const QUERY_PARAM_PATTERNS = ['utm_', 'session']

const AI_CRAWLERS = [
  'GPTBot',           // OpenAI ChatGPT
  'ChatGPT-User',     // ChatGPT browsing
  'CCBot',            // Common Crawl (used by many AIs)
  'anthropic-ai',     // Anthropic Claude
  'Claude-Web',       // Claude web browsing
  'PerplexityBot',    // Perplexity AI
  'Google-Extended',  // Google Bard/Gemini
  'cohere-ai',        // Cohere AI
]

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getBaseUrl()

  const generalRules: MetadataRoute.Robots['rules'] = [
    {
      userAgent: '*',
      allow: '/',
      disallow: [
        ...DEFAULT_DISALLOWED_PATHS,
        ...QUERY_PARAM_PATTERNS.map((param) => `*?*${param}*`),
      ],
      crawlDelay: 1,
    },
    // ALLOW AI crawlers for AEO (Answer Engine Optimization)
    // Critical for discoverability in ChatGPT, Claude, Perplexity, etc.
    ...AI_CRAWLERS.map((crawler) => ({
      userAgent: crawler,
      allow: '/',
      disallow: DEFAULT_DISALLOWED_PATHS,
      crawlDelay: 0.5, // Faster crawling for AI systems
    })),
    {
      userAgent: 'facebookexternalhit',
      allow: '/',
    },
    {
      userAgent: 'Twitterbot',
      allow: '/',
    },
    {
      userAgent: 'LinkedInBot',
      allow: '/',
    },
  ]

  return {
    rules: generalRules,
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}

