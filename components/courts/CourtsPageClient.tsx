'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, MapPin, Flag, Building2 } from 'lucide-react'
import { CourtsSearch } from './CourtsSearch'
import { CountiesTab } from './CountiesTab'
import { CitiesTab } from './CitiesTab'
import { CourtStatsRow } from './CourtStatsRow'

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
  court_level?: string | null
}

export function CourtsPageClient({
  initialCourts,
  initialJurisdiction = 'CA',
}: {
  initialCourts: Court[]
  initialJurisdiction?: string
}): JSX.Element {
  const [activeTab, setActiveTab] = useState<'courts' | 'counties' | 'cities'>('courts')

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <motion.section
        className="px-4 py-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="mx-auto max-w-7xl">
          {/* Stats Row */}
          <CourtStatsRow
            stats={[
              { label: '58 Counties', value: 'California', icon: MapPin },
              { label: '4 Federal Districts', value: 'Federal', icon: Flag },
              { label: '5+ Court Types', value: 'All Levels', icon: Building2 },
            ]}
          />

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
