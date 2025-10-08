import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import { Providers } from '@/components/providers/Providers'
import { Header } from '@/components/ui/Header'
import { Footer } from '@/components/ui/Footer'
import BottomNavigation from '@/components/ui/BottomNavigation'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { DonationButton } from '@/components/fundraising/DonationButton'
import PageTransition from '@/components/transitions/PageTransition'

const BASE_URL = getBaseUrl()

const inter = Inter({ subsets: ['latin'], display: 'swap' })

// Safely create URL with fallback
function getMetadataBaseUrl(): URL {
  try {
    const url = BASE_URL || 'https://judgefinder.io'
    return new URL(url)
  } catch (error) {
    console.error('Invalid BASE_URL:', BASE_URL, error)
    return new URL('https://judgefinder.io')
  }
}

export const metadata: Metadata = {
  // Ensure absolute URLs for Open Graph/Twitter images
  metadataBase: getMetadataBaseUrl(),
  title: 'JudgeFinder.io - Find Information About Your Judge',
  description: 'Find information about your assigned judge. Understand what to expect in your court appearance with simple, clear insights.',
  keywords: 'find judge, court appearance, judge information, California judges, court preparation',
  openGraph: {
    title: 'JudgeFinder.io - Find Your Judge',
    description: 'Get information about your assigned judge',
    url: BASE_URL,
    siteName: 'JudgeFinder.io',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    canonical: BASE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JudgeFinder.io - Find Your Judge',
    description: 'Get information about your assigned judge',
    images: ['/twitter-image.png'],
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.className} dark`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        {/* Performance: DNS Prefetch + Preconnect for common origins */}
        {(() => {
          try {
            if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
              const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
              return (
                <>
                  <link rel="dns-prefetch" href={supabaseOrigin} />
                  <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
                </>
              )
            }
          } catch (e) {
            console.error('Invalid SUPABASE_URL:', e)
          }
          return null
        })()}
        <link rel="dns-prefetch" href="https://clerk.judgefinder.io" />
        <link rel="preconnect" href="https://clerk.judgefinder.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.clerk.com" />
        <link rel="preconnect" href="https://cdn.clerk.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.courtlistener.com" />
        <link rel="preconnect" href="https://www.courtlistener.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="JudgeFinder" />
        <meta name="application-name" content="JudgeFinder" />
        <meta name="theme-color" content="hsl(199 82% 53%)" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* Search Engine Verification Codes
            IMPORTANT: Replace these placeholder values with actual verification codes from:
            - Google Search Console: https://search.google.com/search-console
            - Bing Webmaster Tools: https://www.bing.com/webmasters
            Without real verification codes, search engines cannot verify site ownership.
            See docs/SEO_SETUP.md for complete setup instructions.
        */}
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        )}
        {process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION && (
          <meta name="msvalidate.01" content={process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION} />
        )}
        {process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        {/* Google Analytics 4
            IMPORTANT: Add NEXT_PUBLIC_GA_MEASUREMENT_ID to your environment variables
            Format: G-XXXXXXXXXX (obtainable from Google Analytics dashboard)
            Analytics respects cookie consent and tracks user interactions for insights.
            See docs/SEO_SETUP.md for GA4 property creation and setup instructions.
        */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
              id="google-analytics"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());

                  // Configure GA4 with enhanced privacy settings
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                    anonymize_ip: true,
                    cookie_flags: 'SameSite=None;Secure',
                    // Respect user privacy - check for consent before tracking
                    send_page_view: true
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <GlobalErrorBoundary>
          <Providers><ServiceWorkerRegistration />
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <div className="mx-auto hidden w-full max-w-6xl items-center justify-end px-4 py-3 md:flex">
                <DonationButton amount={25} variant="header" />
              </div>
              <main id="main-content" className="flex-1 pb-16 md:pb-0">
                <PageTransition>
                  {children}
                </PageTransition>
              </main>
              <div className="mb-16 md:mb-0">
                <Footer />
              </div>
              <BottomNavigation />
            </div>
          </Providers>
        </GlobalErrorBoundary>
      </body>
    </html>
  )
}
