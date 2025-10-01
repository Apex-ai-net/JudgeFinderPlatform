'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Scale, TrendingUp, MapPin, FileText, Heart } from 'lucide-react'
import { DonationButton } from '@/components/fundraising/DonationButton'

export function Footer() {
  const footerSections = [
    {
      title: 'Find Judges',
      icon: Scale,
      links: [
        { href: '/judges', label: 'All CA Judges' },
        { href: '/compare', label: 'Compare Judges' },
        { href: '/courts', label: 'Courts Directory' }
      ]
    },
    {
      title: 'Top Counties',
      icon: MapPin,
      links: [
        { href: '/jurisdictions/los-angeles-county', label: 'Los Angeles County' },
        { href: '/jurisdictions/orange-county', label: 'Orange County' },
        { href: '/jurisdictions/san-diego-county', label: 'San Diego County' }
      ]
    },
    {
      title: 'Resources',
      icon: TrendingUp,
      links: [
        { href: '/about', label: 'About Us' },
        { href: '/analytics', label: 'Analytics' },
        { href: '/sitemap.xml', label: 'Sitemap' }
      ]
    },
    {
      title: 'Legal',
      icon: FileText,
      links: [
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
        { href: '/contact', label: 'Contact' }
      ]
    }
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
            <span>JudgeFinder.io - Research California judges with comprehensive analytics and pattern analysis</span>
          </motion.div>

          <motion.p
            className="text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            &copy; {new Date().getFullYear()} JudgeFinder. Free judicial transparency for California citizens.
          </motion.p>
        </motion.div>
      </div>
    </footer>
  )
}
