'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Users,
  Scale,
  CheckCircle2,
  MapPin,
  Search,
  Sparkles,
  ArrowRight,
  Building2,
} from 'lucide-react'
import {
  AttorneyCard,
  AttorneyCardSkeleton,
  type Attorney,
} from '@/components/attorneys/AttorneyCard'
import { TypewriterText } from '@/components/ui/TypewriterText'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'
import { createCanonicalSlug } from '@/lib/utils/slug'

interface Jurisdiction {
  jurisdiction: string
  attorney_count: number
}

interface AttorneysPageClientProps {
  stats: {
    totalAttorneys: number
    verifiedAttorneys: number
    jurisdictions: Jurisdiction[]
  }
  featuredAttorneys: Attorney[]
}

export function AttorneysPageClient({
  stats,
  featuredAttorneys,
}: AttorneysPageClientProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredJurisdictions = stats.jurisdictions.filter((j) =>
    j.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                Attorney Directory
              </span>
              <br />
              <span className="text-foreground">
                <TypewriterText text="Find Legal Experts" />
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-12 max-w-2xl text-lg md:text-xl text-muted-foreground"
          >
            Browse verified attorneys by jurisdiction and practice area. Find experienced legal
            professionals with proven track records.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8 mb-8"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary mb-1">
                <Users className="h-8 w-8" />
                {stats.totalAttorneys.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total Attorneys</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-3xl font-bold text-success mb-1">
                <CheckCircle2 className="h-8 w-8" />
                {stats.verifiedAttorneys.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-3xl font-bold text-accent mb-1">
                <MapPin className="h-8 w-8" />
                {stats.jurisdictions.length}
              </div>
              <p className="text-sm text-muted-foreground">Jurisdictions</p>
            </div>
          </motion.div>
        </div>

        <ScrollIndicator />
      </section>

      {/* Featured Attorneys Section */}
      {featuredAttorneys.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Top-Rated Professionals</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Attorneys</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Connect with verified attorneys who have proven track records in California courts
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredAttorneys.map((attorney, index) => (
                <motion.div
                  key={attorney.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <AttorneyCard attorney={attorney} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse by Jurisdiction Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-4">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Browse by Location</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Find Attorneys by Jurisdiction</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Search for legal professionals practicing in your area
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search jurisdictions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background
                         focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </motion.div>

          {/* Jurisdiction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJurisdictions.slice(0, 12).map((jurisdiction, index) => {
              const slug = createCanonicalSlug(jurisdiction.jurisdiction)
              return (
                <motion.div
                  key={jurisdiction.jurisdiction}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/attorneys/${slug}`}
                    className="block p-6 rounded-lg border border-border bg-card hover:bg-accent/5
                             hover:border-primary/50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                            {jurisdiction.jurisdiction}
                          </h3>
                          {jurisdiction.attorney_count > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {jurisdiction.attorney_count} attorneys
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {filteredJurisdictions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No jurisdictions found matching your search.</p>
            </div>
          )}

          {filteredJurisdictions.length > 12 && (
            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground">
                Showing 12 of {filteredJurisdictions.length} jurisdictions. Use search to find more.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Scale className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Are You an Attorney?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join our directory and connect with clients who need your expertise. Get verified and
              start building your profile today.
            </p>
            <button
              className="px-8 py-4 rounded-lg bg-primary text-primary-foreground font-medium
                       hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              Join Directory
              <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
