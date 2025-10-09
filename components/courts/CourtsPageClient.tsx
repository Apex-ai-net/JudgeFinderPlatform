'use client'

import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { CourtsSearch } from './CourtsSearch'
import { CountiesTab } from './CountiesTab'
import { CitiesTab } from './CitiesTab'
import { TypewriterText } from '@/components/ui/TypewriterText'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'

interface Court {
  id: string
  name: string
  type: string
  jurisdiction: string
  slug?: string
  address?: string | number
  phone?: string
  website?: string
  judge_count: number
}

export function CourtsPageClient({
  initialCourts,
  initialJurisdiction = 'CA',
}: {
  initialCourts: Court[]
  initialJurisdiction?: string
}): JSX.Element {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3])

  const [activeTab, setActiveTab] = useState<'courts' | 'counties' | 'cities'>('courts')

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <section className="relative min-h-[60vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-enterprise-primary/10 via-enterprise-deep/10 to-background" />

        <motion.div
          className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full"
          style={{ y, opacity }}
        >
          <motion.div
            className="mb-6 flex items-center justify-center gap-2 text-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-medium">Courts</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-enterprise-primary to-enterprise-deep bg-clip-text text-transparent">
                Courts
              </span>
              <br />
              <span className="text-foreground">
                <TypewriterText text="Directory" />
              </span>
            </h1>
          </motion.div>

          <motion.p
            className="mx-auto mb-12 max-w-2xl text-lg md:text-xl text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Browse courts across jurisdictions. Search by type, jurisdiction, and location to find
            court information and assigned judges.
          </motion.p>

          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Comprehensive court database</span>
          </motion.div>
        </motion.div>

        <ScrollIndicator />
      </section>

      <motion.section
        className="px-4 py-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Explore California's court network</span>
            </div>
          </motion.div>

          <div className="mb-6 flex items-center gap-2 justify-center">
            <button
              onClick={() => setActiveTab('courts')}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                activeTab === 'courts'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:bg-accent/5'
              }`}
            >
              Courts
            </button>
            <button
              onClick={() => setActiveTab('counties')}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                activeTab === 'counties'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:bg-accent/5'
              }`}
            >
              Counties
            </button>
            <button
              onClick={() => setActiveTab('cities')}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                activeTab === 'cities'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:bg-accent/5'
              }`}
            >
              Cities
            </button>
          </div>

          <div className="mx-auto max-w-6xl">
            {activeTab === 'courts' && (
              <CourtsSearch
                initialCourts={initialCourts}
                initialJurisdiction={initialJurisdiction}
              />
            )}
            {activeTab === 'counties' && <CountiesTab />}
            {activeTab === 'cities' && <CitiesTab />}
          </div>
        </div>
      </motion.section>
    </div>
  )
}
