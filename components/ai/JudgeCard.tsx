'use client'

import Link from 'next/link'
import { MapPin, Building, Calendar, BarChart3, ArrowRight, Scale, Gavel } from 'lucide-react'

function AnalyticsMetric({
  label,
  value,
  suffix,
}: {
  label: string
  value: number | null | undefined
  suffix?: string
}): JSX.Element {
  if (value === null || value === undefined) {
    return (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">Data unavailable</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-foreground">
        {value}
        {suffix}
      </span>
    </div>
  )
}

interface JudgeAnalyticsPreview {
  overall_confidence: number | null
  total_cases_analyzed: number | null
  civil_plaintiff_favor: number | null
  criminal_sentencing_severity: number | null
  generated_at: string | null
}

interface JudgeCardProps {
  judge: {
    id: string
    name: string
    slug?: string
    court_name?: string
    jurisdiction?: string
    appointed_date?: string
    case_count?: number
    analytics_preview?: JudgeAnalyticsPreview | null
    image_url?: string
  }
  compact?: boolean
}

export default function JudgeCard({ judge, compact = false }: JudgeCardProps): JSX.Element {
  // Calculate years of service
  const yearsOfService = judge.appointed_date
    ? new Date().getFullYear() - new Date(judge.appointed_date).getFullYear()
    : null

  // Generate slug if not provided
  const judgeSlug =
    judge.slug ||
    judge.name
      .toLowerCase()
      .replace(/^(judge|justice|the honorable)\s+/i, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

  const handleViewProfile = () => {
    // Track click for analytics
    fetch('/api/analytics/chat-funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'judge_card_click',
        judge_id: judge.id,
        judge_name: judge.name,
        source: 'chat',
      }),
    }).catch(console.error)
  }

  if (compact) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{judge.name}</h4>
              <p className="text-sm text-muted-foreground">
                {judge.court_name || 'Court information not available'}
              </p>
            </div>
          </div>
        </div>

        <Link
          href={`/judges/${judgeSlug}`}
          onClick={handleViewProfile}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-blue-700"
        >
          View Profile
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden border border-border/50 bg-card rounded-xl p-5 hover:shadow-xl hover:border-primary/60 transition-all duration-200">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      </div>

      {/* Header */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Gavel className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{judge.name}</h3>
            <p className="text-sm text-muted-foreground">
              {judge.court_name || 'California Court'}
            </p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span>{judge.jurisdiction || 'California'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-foreground">
          <Building className="w-4 h-4 text-muted-foreground" />
          <span>Superior Court</span>
        </div>

        {yearsOfService && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{yearsOfService}+ Years</span>
          </div>
        )}

        {judge.case_count && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Scale className="w-4 h-4 text-muted-foreground" />
            <span>{judge.case_count.toLocaleString()} Cases</span>
          </div>
        )}
      </div>

      {/* Analytics Preview */}
      {judge.analytics_preview && (
        <div className="relative mb-4 p-3 bg-muted/30 rounded-lg border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Analytics Snapshot</span>
            <span className="text-xs text-muted-foreground">
              {judge.analytics_preview.total_cases_analyzed
                ? `${judge.analytics_preview.total_cases_analyzed.toLocaleString()} cases`
                : 'Data pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnalyticsMetric
              label="Civil plaintiff favor"
              value={judge.analytics_preview.civil_plaintiff_favor}
              suffix="%"
            />
            <AnalyticsMetric
              label="Sentencing severity"
              value={judge.analytics_preview.criminal_sentencing_severity}
              suffix="%"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Confidence: {judge.analytics_preview.overall_confidence ?? 'N/A'}%</span>
            <span>
              Updated{' '}
              {judge.analytics_preview.generated_at
                ? new Date(judge.analytics_preview.generated_at).toLocaleDateString()
                : 'recently'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Full analytics available on profile page
          </p>
        </div>
      )}

      {/* CTA Button */}
      <Link
        href={`/judges/${judgeSlug}`}
        onClick={handleViewProfile}
        className="relative w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 hover:shadow-lg transition-all duration-200"
      >
        <BarChart3 className="w-5 h-5" />
        View Full Profile & Analytics
        <ArrowRight className="w-5 h-5" />
      </Link>

      {/* Trust Badge */}
      <div className="relative mt-3 text-center">
        <p className="text-xs text-muted-foreground">
          Built with public court data. Verify details on each profile.
        </p>
      </div>
    </div>
  )
}
