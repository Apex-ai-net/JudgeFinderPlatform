'use client'

import { AlertCircle, Info, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface JudicialDataDisclaimerProps {
  /**
   * Display variant - controls the visual style and prominence
   * - 'prominent': Full-width alert with icon (for profile headers)
   * - 'compact': Condensed card format (for sidebars)
   * - 'inline': Minimal inline text (for tables/lists)
   */
  variant?: 'prominent' | 'compact' | 'inline'

  /**
   * Whether to show the "Learn More" link to methodology documentation
   */
  showMethodologyLink?: boolean

  /**
   * Custom last updated timestamp for the data
   */
  lastUpdated?: Date | string

  /**
   * Custom class name for additional styling
   */
  className?: string
}

/**
 * Reusable disclaimer component for judicial analytics and data
 *
 * Displays legal disclaimers about:
 * - Statistical nature of bias indicators
 * - Data accuracy limitations
 * - CourtListener source attribution
 * - Methodology transparency
 *
 * @example
 * // Prominent header disclaimer on judge profile
 * <JudicialDataDisclaimer variant="prominent" showMethodologyLink={true} />
 *
 * @example
 * // Compact sidebar disclaimer
 * <JudicialDataDisclaimer variant="compact" lastUpdated={judge.data_updated_at} />
 *
 * @example
 * // Inline disclaimer for data tables
 * <JudicialDataDisclaimer variant="inline" />
 */
export function JudicialDataDisclaimer({
  variant = 'prominent',
  showMethodologyLink = true,
  lastUpdated,
  className = ''
}: JudicialDataDisclaimerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null

  // Inline variant - minimal text disclaimer
  if (variant === 'inline') {
    return (
      <span className={`text-xs text-muted-foreground italic ${className}`}>
        Statistical analysis only. Not a character judgment.{' '}
        {showMethodologyLink && (
          <a
            href="/docs/methodology"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            See methodology
          </a>
        )}
      </span>
    )
  }

  // Compact variant - condensed card
  if (variant === 'compact') {
    return (
      <Card className={`border-amber-200 bg-amber-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900 mb-1">
                Data Disclaimer
              </p>
              <p className="text-amber-800 text-xs leading-relaxed">
                Bias indicators are statistical analyses of case outcomes, not character judgments.
                Data sourced from public court records via CourtListener.
              </p>
              {formattedDate && (
                <p className="text-amber-700 text-xs mt-2">
                  Last updated: {formattedDate}
                </p>
              )}
              {showMethodologyLink && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-amber-900 hover:text-amber-700 mt-2"
                  asChild
                >
                  <a href="/docs/methodology" target="_blank" rel="noopener noreferrer">
                    View methodology <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prominent variant - full alert with expandable details
  return (
    <Alert className={`border-amber-300 bg-amber-50 ${className}`}>
      <AlertCircle className="h-5 w-5 text-amber-700" />
      <AlertTitle className="text-amber-900 font-semibold">
        Important: Judicial Analytics Disclaimer
      </AlertTitle>
      <AlertDescription className="text-amber-800">
        <p className="font-medium mb-2">
          The bias indicators and statistical metrics displayed are mathematical analyses of publicly available
          case outcome data, not character judgments or assessments of judicial fitness.
        </p>

        {isExpanded ? (
          <div className="space-y-3 text-sm mt-3">
            <div>
              <p className="font-semibold mb-1">What These Analytics Represent:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Statistical correlations that may reflect case mix, jurisdiction characteristics, or procedural factors</li>
                <li>Aggregated patterns that do not account for case-specific facts or applicable law</li>
                <li>Historical trend indicators that may not predict future outcomes</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-1">Data Sources and Limitations:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Primary data sourced from CourtListener by the Free Law Project</li>
                <li>Minimum 500 publicly available cases required for bias analytics</li>
                <li>Data may lag 30-90 days behind real-time court activity</li>
                <li>Sealed cases and confidential proceedings are excluded</li>
              </ul>
            </div>

            <div className="bg-white/60 p-3 rounded border border-amber-200 mt-3">
              <p className="font-semibold text-amber-900 mb-1">
                These analytics should be interpreted as one data point among many factors when researching
                judicial backgrounds.
              </p>
              <p className="text-xs">
                They do not constitute evidence of judicial misconduct, unfitness, or impropriety.
                Users should not rely solely on these metrics for legal strategy decisions.
              </p>
            </div>

            {formattedDate && (
              <p className="text-xs text-amber-700 pt-2 border-t border-amber-200">
                Data last updated: {formattedDate}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm mt-2">
            These analytics do not constitute evidence of judicial misconduct or character deficiencies.
          </p>
        )}

        <div className="flex gap-3 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
          >
            {isExpanded ? 'Show Less' : 'Read Full Disclaimer'}
          </Button>

          {showMethodologyLink && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
              asChild
            >
              <a href="/docs/methodology" target="_blank" rel="noopener noreferrer">
                View Methodology <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
            asChild
          >
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Full Terms <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Simplified disclaimer specifically for bias indicator tooltips and popovers
 */
export function BiasIndicatorTooltip({ className = '' }: { className?: string }) {
  return (
    <div className={`text-xs space-y-1 ${className}`}>
      <p className="font-semibold">Statistical Analysis Only</p>
      <p>
        This indicator represents a statistical pattern in case outcomes, not a character judgment.
        Multiple factors can influence these patterns.
      </p>
      <a
        href="/docs/methodology"
        className="text-blue-600 hover:underline inline-flex items-center gap-1"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

/**
 * Data accuracy disclaimer specifically for case count and historical data
 */
export function DataAccuracyDisclaimer({
  caseCount,
  className = ''
}: {
  caseCount?: number
  className?: string
}) {
  return (
    <Alert className={`border-gray-300 bg-gray-50 ${className}`}>
      <Info className="h-4 w-4 text-gray-600" />
      <AlertDescription className="text-gray-700 text-sm">
        {caseCount !== undefined && caseCount < 500 ? (
          <p>
            <strong>Limited Data:</strong> This judge has {caseCount} publicly available cases.
            Bias analytics require a minimum of 500 cases for statistical reliability.
            Data may not be representative of overall judicial patterns.
          </p>
        ) : (
          <p>
            Data is sourced from public court records and may be 30-90 days behind real-time court activity.
            Historical records prior to 2010 may be incomplete. Always verify critical information through
            official court sources.
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}
