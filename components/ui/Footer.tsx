'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Scale,
  TrendingUp,
  MapPin,
  FileText,
  Heart,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { DonationButton } from '@/components/fundraising/DonationButton'

export function Footer(): JSX.Element {
  // SEO verification status (dev mode only)
  const isDev = process.env.NODE_ENV === 'development'
  const hasGoogleVerification = !!process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  const hasBingVerification = !!process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
  const hasGoogleAnalytics = !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const footerSections = [
    {
      title: 'Find Judges',
      icon: Scale,
      links: [
        { href: '/judges', label: 'All CA Judges' },
        { href: '/compare', label: 'Compare Judges' },
        { href: '/courts', label: 'Courts Directory' },
      ],
    },
    {
      title: 'For Attorneys',
      icon: TrendingUp,
      links: [
        { href: '/for-attorneys', label: 'Attorney Resources' },
        { href: '/advertise', label: 'Advertise Your Firm' },
        { href: '/pricing', label: 'Premium Subscription' },
      ],
    },
    {
      title: 'Top Counties',
      icon: MapPin,
      links: [
        { href: '/jurisdictions/los-angeles-county', label: 'Los Angeles County' },
        { href: '/jurisdictions/orange-county', label: 'Orange County' },
        { href: '/jurisdictions/san-diego-county', label: 'San Diego County' },
      ],
    },
    {
      title: 'Legal',
      icon: FileText,
      links: [
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
        { href: '/contact', label: 'Contact' },
        { href: '/docs/ads-policy', label: 'Advertising Policy' },
      ],
    },
  ]

  return (
    <footer className="bg-muted/50 text-muted-foreground border-t border-border pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* SEO-Optimized Links Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
          {footerSections.map((section, sectionIndex) => {
            const Icon = section.icon
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: sectionIndex * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground">{section.title}</h3>
                </div>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: sectionIndex * 0.1 + linkIndex * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        className="text-xs hover:text-primary transition-colors inline-flex items-center group"
                      >
                        <span className="group-hover:translate-x-1 transition-transform duration-200">
                          {link.label}
                        </span>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* SEO Description */}
        <motion.div
          className="text-center py-4 border-t border-border/50 space-y-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <DonationButton amount={25} variant="footer" className="mx-auto max-w-xs" />

          <motion.div
            className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Heart className="h-3.5 w-3.5 text-primary fill-primary" />
            <span>
              JudgeFinder.io - Research California judges with comprehensive analytics and pattern
              analysis
            </span>
          </motion.div>

          <motion.p
            className="text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            &copy; {new Date().getFullYear()} JudgeFinder. Free judicial transparency for California
            citizens.
          </motion.p>

          {/* SEO Verification Status - Dev Mode Only */}
          {isDev && (
            <motion.div
              className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/50"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-xs font-semibold text-foreground">
                  SEO Configuration Status
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {hasGoogleVerification ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className={hasGoogleVerification ? 'text-green-500' : 'text-red-500'}>
                    Google Search Console
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {hasBingVerification ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className={hasBingVerification ? 'text-green-500' : 'text-red-500'}>
                    Bing Webmaster Tools
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {hasGoogleAnalytics ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className={hasGoogleAnalytics ? 'text-green-500' : 'text-red-500'}>
                    Google Analytics 4
                  </span>
                </div>
              </div>
              <Link
                href="/docs/SEO_SETUP.md"
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                View Setup Guide →
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </footer>
  )
}
