'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Vote,
  Calendar,
  MapPin,
  Search,
  ExternalLink,
  BookOpen,
  AlertCircle,
  Filter,
  ChevronRight,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Building2,
} from 'lucide-react'
import { AnimatedCard } from '@/components/micro-interactions'
import { TypewriterText } from '@/components/ui/TypewriterText'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'
import { fadeInUp, staggerContainer } from '@/lib/animations/presets'
import { JudgeWithElections } from '@/types/elections'

interface UpcomingElection {
  judge_id: string
  judge_name: string
  court_name: string | null
  election_date: string
  election_type: string
  position_sought: string
  jurisdiction: string | null
  days_until_election: number
  county?: string
}

interface ElectionsData {
  total_count: number
  elections: UpcomingElection[]
  next_30_days: number
  next_90_days: number
  next_180_days: number
  counties?: string[]
}

export default function ElectionsPageClient(): JSX.Element {
  const [electionsData, setElectionsData] = useState<ElectionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCounty, setSelectedCounty] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'county'>('date')

  // Fetch upcoming elections data
  useEffect(() => {
    async function fetchElections() {
      try {
        const response = await fetch('/api/elections/upcoming?days=365&limit=100')

        if (!response.ok) {
          throw new Error('Failed to fetch elections')
        }

        const data = await response.json()
        setElectionsData(data)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching elections:', err)

        // Fallback to empty data on error
        setElectionsData({
          total_count: 0,
          elections: [],
          next_30_days: 0,
          next_90_days: 0,
          next_180_days: 0,
          counties: [],
        })
        setError('Failed to load election data')
        setLoading(false)
      }
    }

    fetchElections()
  }, [])

  // Filter and sort elections
  const filteredElections = useMemo(() => {
    if (!electionsData?.elections) return []

    let filtered = electionsData.elections

    // Filter by county
    if (selectedCounty !== 'all') {
      filtered = filtered.filter(
        (e) => e.jurisdiction === selectedCounty || e.county === selectedCounty
      )
    }

    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => a.days_until_election - b.days_until_election)
    } else {
      filtered.sort((a, b) => (a.jurisdiction || '').localeCompare(b.jurisdiction || ''))
    }

    return filtered
  }, [electionsData, selectedCounty, sortBy])

  const availableCounties = electionsData?.counties || []

  if (loading) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-background">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:60px_60px]" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 20,
            ease: 'linear',
          }}
        />
        {/* Radial gradient overlay for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full">
          <motion.div variants={staggerContainer} initial="initial" animate="animate">
            {/* Badge */}
            <motion.div variants={fadeInUp} className="flex justify-center mb-6">
              <motion.span
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <Vote className="h-4 w-4" />
                California Voter Guide
              </motion.span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={fadeInUp}
              className="mb-8 text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]"
            >
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                Know Your Judges
              </span>
              <br />
              <span className="text-white">
                Before You <TypewriterText text="Vote" />
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeInUp}
              className="mx-auto mb-14 max-w-3xl text-lg md:text-xl text-slate-300 leading-relaxed"
            >
              Make informed decisions in judicial elections. Research candidates, view their
              records, and understand their judicial philosophy before casting your ballot. Every
              judge matters.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.a
                href="#upcoming-elections"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-primary/90 transition-all duration-200 group"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Calendar className="h-5 w-5" />
                View Upcoming Elections
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </motion.a>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/judges"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-8 py-4 text-base font-semibold text-foreground hover:bg-accent transition-all duration-200"
                >
                  <Search className="h-5 w-5" />
                  Search All Judges
                </Link>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeInUp}
              className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            >
              <div className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  {electionsData?.next_30_days || 0}
                </div>
                <div className="text-sm text-slate-400 mt-2 font-medium">
                  Elections Next 30 Days
                </div>
              </div>
              <div className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  {electionsData?.next_90_days || 0}
                </div>
                <div className="text-sm text-slate-400 mt-2 font-medium">
                  Elections left 30 Days
                </div>
              </div>
              <div className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  {availableCounties.length}
                </div>
                <div className="text-sm text-slate-400 mt-2 font-medium">Counties Covered</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <ScrollIndicator />
      </section>

      {/* Upcoming Elections Section */}
      <section id="upcoming-elections" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Upcoming Judicial Elections
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Find judges on your ballot and research their backgrounds, rulings, and judicial
              philosophy
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <label htmlFor="county-filter" className="text-sm font-medium text-foreground">
                  County:
                </label>
              </div>
              <select
                id="county-filter"
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
                className="flex-1 sm:w-auto rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Counties</option>
                {availableCounties.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <button
                onClick={() => setSortBy('date')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'date'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Date
              </button>
              <button
                onClick={() => setSortBy('county')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'county'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                County
              </button>
            </div>
          </div>

          {/* Elections List or Empty State */}
          {filteredElections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredElections.map((election) => (
                <ElectionCard key={election.judge_id} election={election} />
              ))}
            </div>
          ) : (
            <EmptyElectionsState />
          )}
        </div>
      </section>

      {/* Search by Address Section */}
      <section className="py-20 bg-gradient-to-b from-muted/20 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Find Judges on Your Specific Ballot
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Enter your address to see exactly which judicial races will appear on your ballot
              </p>
              <div className="bg-background border-2 border-dashed border-border/60 rounded-2xl p-10 hover:border-primary/40 transition-all duration-300">
                <div className="flex items-center justify-center gap-3 text-muted-foreground mb-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                    <Clock className="h-5 w-5" />
                  </div>
                  <span className="text-base font-semibold">Coming Soon</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                  We're building personalized ballot lookup based on your address. Check back soon
                  for this feature!
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Educational Resources Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Understanding Judicial Elections
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Learn how judicial elections work in California and why they matter
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <EducationalCard
              icon={<Vote className="h-6 w-6" />}
              title="How Judicial Elections Work in California"
              description="California uses different methods for selecting judges depending on the court level. Superior Court judges are elected by voters in nonpartisan elections."
              link="/help-center/features"
            />
            <EducationalCard
              icon={<CheckCircle className="h-6 w-6" />}
              title="What is a Retention Election?"
              description="In retention elections, voters answer yes or no to whether a judge should remain in office. There are no opposing candidates."
              link="/help-center/features"
            />
            <EducationalCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Why Judicial Independence Matters"
              description="Learn about the importance of an independent judiciary and how it protects the rule of law and constitutional rights."
              link="/help-center/features"
            />
          </div>

          {/* External Resources */}
          <div className="mt-16 bg-gradient-to-br from-muted/40 to-muted/20 rounded-3xl p-10 border border-border/50">
            <h3 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
              Official Voter Resources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResourceLink
                href="https://www.sos.ca.gov/elections/upcoming-elections"
                label="California Secretary of State - Election Information"
              />
              <ResourceLink
                href="https://www.sos.ca.gov/elections/voter-registration"
                label="Check Your Voter Registration Status"
              />
              <ResourceLink
                href="https://www.courts.ca.gov/3014.htm"
                label="California Courts - Judicial Elections Information"
              />
              <ResourceLink
                href="https://voterstatus.sos.ca.gov/"
                label="Find Your Polling Place"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Election Calendar Placeholder */}
      <section className="py-20 bg-gradient-to-b from-muted/20 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              2025 Judicial Election Calendar
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Important dates for California judicial elections
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CalendarDateCard
                date="October 20, 2025"
                title="Voter Registration Deadline"
                description="Last day to register to vote in the November election"
                variant="warning"
              />
              <CalendarDateCard
                date="November 4, 2025"
                title="Election Day"
                description="General election for judicial positions"
                variant="primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-12 border border-primary/20"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Ready to Research Your Judges?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Access comprehensive profiles, ruling patterns, and analytics for every California
              judge
            </p>
            <Link
              href="/judges"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-10 py-5 text-lg font-semibold text-white shadow-2xl hover:bg-primary/90 hover:scale-105 transition-all duration-200"
            >
              <Search className="h-6 w-6" />
              Explore Judge Directory
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

// Component: Election Card
function ElectionCard({ election }: { election: UpcomingElection }): JSX.Element {
  return (
    <AnimatedCard
      intensity="medium"
      className="p-6 hover:shadow-2xl transition-all duration-300 group"
    >
      <Link href={`/judges/${election.judge_id}`} className="block">
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-tight">
              {election.judge_name}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">{election.position_sought}</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {/* Court */}
          {election.court_name && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">{election.court_name}</span>
            </div>
          )}

          {/* Location */}
          {election.jurisdiction && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">{election.jurisdiction}</span>
            </div>
          )}

          {/* Election Date */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <span className="text-foreground font-semibold">
              {formatElectionDate(election.election_date)}
            </span>
          </div>
        </div>

        {/* Days Until Election */}
        <div className="pt-4 border-t-2 border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Election Type
            </span>
            <span className="text-xs font-bold text-foreground capitalize px-2 py-1 rounded-md bg-muted/50">
              {election.election_type.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Days Until Election
            </span>
            <span className="text-base font-bold text-primary">
              {election.days_until_election} days
            </span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border/50">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-200">
            View Judge Profile
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </AnimatedCard>
  )
}

// Component: Empty Elections State
function EmptyElectionsState(): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center py-16 px-4"
    >
      <div className="max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-4">No Upcoming Elections Found</h3>
        <p className="text-muted-foreground mb-8 text-base leading-relaxed">
          There are currently no scheduled judicial elections for your selected filters. Try
          selecting a different county or check back later.
        </p>
        <Link
          href="/judges"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25"
        >
          Browse All Judges
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  )
}

// Component: Educational Card
interface EducationalCardProps {
  icon: React.ReactNode
  title: string
  description: string
  link: string
}

function EducationalCard({ icon, title, description, link }: EducationalCardProps): JSX.Element {
  return (
    <AnimatedCard
      intensity="medium"
      className="p-6 h-full hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-primary w-fit mb-4">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-3 leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{description}</p>
          <Link
            href={link}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all duration-200"
          >
            Learn more
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </AnimatedCard>
  )
}

// Component: Resource Link
function ResourceLink({ href, label }: { href: string; label: string }): JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border-2 border-border bg-background px-5 py-4 text-sm font-medium text-foreground transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:shadow-md group"
    >
      <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-2 group-hover:translate-x-0" />
    </a>
  )
}

// Component: Calendar Date Card
interface CalendarDateCardProps {
  date: string
  title: string
  description: string
  variant: 'primary' | 'warning'
}

function CalendarDateCard({
  date,
  title,
  description,
  variant,
}: CalendarDateCardProps): JSX.Element {
  const colors = {
    primary: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 text-primary',
    warning:
      'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30 text-amber-600',
  }

  return (
    <AnimatedCard intensity="subtle" className="p-7 hover:shadow-xl transition-all duration-300">
      <div className="flex items-start gap-5">
        <div className={`flex-shrink-0 rounded-xl ${colors[variant]} p-4 border-2`}>
          <Calendar className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-primary mb-2 uppercase tracking-wide">{date}</div>
          <h3 className="text-xl font-bold text-foreground mb-2 leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </AnimatedCard>
  )
}

// Utility: Format election date
function formatElectionDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
