'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, MapPin, Building } from 'lucide-react'
import { motion } from 'framer-motion'
import GlassCard from '@/components/ui/GlassCard'

import { resolveCourtSlug } from '@/lib/utils/slug'

interface Judge {
  id: string
  name: string
  slug: string
  court_name: string
  jurisdiction: string
  appointed_date?: string
}

interface RelatedJudgesProps {
  currentJudgeId: string
  courtName: string
  jurisdiction: string
  judgeName: string
  courtSlug?: string | null
}

export function RelatedJudges({
  currentJudgeId,
  courtName,
  jurisdiction,
  judgeName,
  courtSlug,
}: RelatedJudgesProps): JSX.Element {
  const [relatedJudges, setRelatedJudges] = useState<Judge[]>([])
  const [loading, setLoading] = useState(true)
  const preferredCourtSlug = courtSlug || resolveCourtSlug({ name: courtName }) || 'unknown-court'

  useEffect(() => {
    async function fetchRelatedJudges(): Promise<void> {
      try {
        const response = await fetch(
          `/api/judges/related?judgeId=${currentJudgeId}&court=${encodeURIComponent(courtName)}&jurisdiction=${encodeURIComponent(jurisdiction)}&limit=6`
        )

        if (response.ok) {
          const data = await response.json()
          setRelatedJudges(data.judges || [])
        }
      } catch (error) {
        console.error('Error fetching related judges:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRelatedJudges()
  }, [currentJudgeId, courtName, jurisdiction])

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    )
  }

  if (relatedJudges.length === 0) {
    return <></>
  }

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center">
        <User className="h-5 w-5 text-primary mr-2" />
        Other Judges You May Research
      </h2>

      <div className="space-y-4">
        {relatedJudges.map((judge, idx) => (
          <motion.div
            key={judge.id}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ delay: idx * 0.05 }}
          >
            <Link
              href={`/judges/${judge.slug}`}
              className="block group hover:bg-muted rounded-lg p-3 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Judge {judge.name}
                  </h3>
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <span className="flex items-center">
                      <Building className="h-3 w-3 mr-1" />
                      {judge.court_name}
                    </span>
                    {judge.appointed_date && (
                      <span className="text-muted-foreground">
                        Since {new Date(judge.appointed_date).getFullYear()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Link
            href={`/courts/${preferredCourtSlug}`}
            className="flex items-center text-primary hover:text-blue-800 transition-colors"
          >
            <Building className="h-4 w-4 mr-2" />
            View All {courtName} Judges
          </Link>
          <Link
            href={`/jurisdictions/${jurisdiction.toLowerCase().replace(/\s+/g, '-')}`}
            className="flex items-center text-primary hover:text-blue-800 transition-colors"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {jurisdiction} Court Directory
          </Link>
        </div>
      </div>

      {/* SEO Internal Links */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Research judicial patterns and find experienced attorneys in {jurisdiction}. Compare{' '}
          {judgeName}'s ruling history with other {courtName} judges. Access comprehensive legal
          analytics for case strategy and attorney selection in {jurisdiction} courts.
        </p>
      </div>
    </GlassCard>
  )
}
