'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  MapPin,
  Filter,
  Users,
  Scale,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Gavel,
} from 'lucide-react'
import {
  AttorneyCard,
  AttorneyCardSkeleton,
  type Attorney,
} from '@/components/attorneys/AttorneyCard'
import { TypewriterText } from '@/components/ui/TypewriterText'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'

interface JurisdictionAttorneysClientProps {
  attorneys: Attorney[]
  totalCount: number
  jurisdictionName: string
  jurisdictionSlug: string
  relatedJudges: Array<{
    id: string
    name: string
    slug: string
    court_name?: string
  }>
}

export function JurisdictionAttorneysClient({
  attorneys,
  totalCount,
  jurisdictionName,
  jurisdictionSlug,
  relatedJudges,
}: JurisdictionAttorneysClientProps): JSX.Element {
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  // Extract unique specialties
  const specialties = Array.from(
    new Set(attorneys.map((a) => a.specialty).filter((s): s is string => !!s))
  )

  // Filter attorneys
  const filteredAttorneys = attorneys.filter((attorney) => {
    if (verifiedOnly && !attorney.verified) return false
    if (selectedSpecialty !== 'all' && attorney.specialty !== selectedSpecialty) return false
    return true
  })

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
              <Link href="/attorneys" className="hover:text-primary transition-colors">
                Attorneys
              </Link>
              <ChevronDown className="h-4 w-4 -rotate-90" />
              <span className="text-foreground">{jurisdictionName}</span>
            </div>

            <h1 className="mb-6 text-4xl md:text-6xl font-bold tracking-tight">
              <span className="text-foreground">Attorneys in</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                <TypewriterText text={jurisdictionName} />
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground"
          >
            Browse verified attorneys practicing in {jurisdictionName}. Find experienced legal
            professionals who know the local courts.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary mb-1">
                <Users className="h-6 w-6" />
                {filteredAttorneys.length}
              </div>
              <p className="text-xs text-muted-foreground">Attorneys Listed</p>
            </div>
            {specialties.length > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-accent mb-1">
                  <Scale className="h-6 w-6" />
                  {specialties.length}
                </div>
                <p className="text-xs text-muted-foreground">Practice Areas</p>
              </div>
            )}
            {relatedJudges.length > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-success mb-1">
                  <Gavel className="h-6 w-6" />
                  {relatedJudges.length}
                </div>
                <p className="text-xs text-muted-foreground">Local Judges</p>
              </div>
            )}
          </motion.div>
        </div>

        <ScrollIndicator />
      </section>

      {/* Filters Section */}
      <section className="py-8 px-4 border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border
                       bg-background hover:bg-accent/5 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>

            <div className="text-sm text-muted-foreground">
              Showing {filteredAttorneys.length} of {attorneys.length} attorneys
            </div>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4"
            >
              {/* Specialty Filter */}
              {specialties.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Practice Area</label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="all">All Practice Areas</option>
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Verified Only Toggle */}
              <div>
                <label className="block text-sm font-medium mb-2">Attorney Status</label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/5">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Verified Only</span>
                </label>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedSpecialty('all')
                    setVerifiedOnly(false)
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground
                           hover:text-foreground hover:bg-accent/5 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Attorneys Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {filteredAttorneys.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Attorneys Found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or browse all attorneys in this jurisdiction.
              </p>
              <button
                onClick={() => {
                  setSelectedSpecialty('all')
                  setVerifiedOnly(false)
                }}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium
                         hover:bg-primary/90 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAttorneys.map((attorney, index) => (
                <motion.div
                  key={attorney.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AttorneyCard attorney={attorney} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Related Judges Section */}
      {relatedJudges.length > 0 && (
        <section className="py-12 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <Gavel className="w-4 h-4" />
                <span className="text-sm font-medium">Find Attorneys Before These Judges</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">Judges in {jurisdictionName}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Research judges handling cases in this jurisdiction and find attorneys experienced
                before them
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedJudges.slice(0, 6).map((judge, index) => (
                <motion.div
                  key={judge.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/judges/${judge.slug}`}
                    className="block p-4 rounded-lg border border-border bg-card hover:bg-accent/5
                             hover:border-primary/50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                          {judge.name}
                        </h3>
                        {judge.court_name && (
                          <p className="text-sm text-muted-foreground">{judge.court_name}</p>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {relatedJudges.length > 6 && (
              <div className="text-center mt-6">
                <Link
                  href={`/judges?jurisdiction=${jurisdictionSlug}`}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
                >
                  View all {relatedJudges.length} judges in {jurisdictionName}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
