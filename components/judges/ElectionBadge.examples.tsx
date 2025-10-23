/**
 * ElectionBadge Component Examples
 *
 * This file provides comprehensive usage examples for the ElectionBadge component.
 * These examples can be used for documentation, testing, or as a reference for
 * implementation across the application.
 *
 * @module components/judges/ElectionBadge.examples
 */

import { ElectionBadge, ElectionStatusBadge } from './ElectionBadge'
import { SelectionMethod } from '@/types/elections'

/**
 * Example 1: Basic Selection Method Badges
 *
 * Display all available selection methods without election dates.
 * This is useful for showing a judge's selection method in headers or profile cards.
 */
export function BasicSelectionMethodBadges() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Selection Method Badges</h2>

      <div className="flex flex-wrap gap-3">
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          variant="compact"
        />

        <ElectionBadge
          selectionMethod={SelectionMethod.APPOINTED}
          variant="compact"
        />

        <ElectionBadge
          selectionMethod={SelectionMethod.RETENTION_ELECTION}
          variant="compact"
        />

        <ElectionBadge
          selectionMethod={SelectionMethod.MERIT_SELECTION}
          variant="compact"
        />

        <ElectionBadge
          selectionMethod={SelectionMethod.LEGISLATIVE_APPOINTMENT}
          variant="compact"
        />

        <ElectionBadge
          selectionMethod={SelectionMethod.COMMISSION_APPOINTMENT}
          variant="compact"
        />
      </div>
    </div>
  )
}

/**
 * Example 2: Detailed Badges with Election Dates
 *
 * Display badges with upcoming election information.
 * This variant is ideal for judge headers or detailed profile sections.
 */
export function DetailedBadgesWithElections() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Badges with Election Dates</h2>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Elected judge with upcoming election</p>
          <ElectionBadge
            selectionMethod={SelectionMethod.ELECTED}
            nextElectionDate="2026-11-03"
            variant="detailed"
          />
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Retention election judge</p>
          <ElectionBadge
            selectionMethod={SelectionMethod.RETENTION_ELECTION}
            nextElectionDate="2028-06-07"
            variant="detailed"
          />
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Appointed judge (no elections)</p>
          <ElectionBadge
            selectionMethod={SelectionMethod.APPOINTED}
            variant="detailed"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Example 3: Judge Currently Up for Election
 *
 * Display badges for judges who are currently up for election (within 180 days).
 * These badges include visual indicators like pulse animations to draw attention.
 */
export function UpForElectionBadges() {
  // Date 90 days in the future
  const upcomingElectionDate = new Date()
  upcomingElectionDate.setDate(upcomingElectionDate.getDate() + 90)
  const dateString = upcomingElectionDate.toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Judge Up for Election</h2>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Election in 90 days</p>
          <ElectionBadge
            selectionMethod={SelectionMethod.ELECTED}
            nextElectionDate={dateString}
            isUpForElection={true}
            showCountdown={true}
            variant="detailed"
          />
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Auto-detected status (ElectionStatusBadge)</p>
          <ElectionStatusBadge
            selectionMethod={SelectionMethod.RETENTION_ELECTION}
            nextElectionDate={dateString}
            variant="detailed"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Example 4: Minimal Variant (Icon Only)
 *
 * Ultra-compact badges showing only an icon with tooltip.
 * Perfect for space-constrained layouts or when displaying multiple judges.
 */
export function MinimalBadges() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Minimal Icon Badges</h2>

      <div className="flex gap-2">
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          variant="minimal"
        />

        <ElectionBadge
          selectionMethod={SelectionMethod.APPOINTED}
          variant="minimal"
        />

        <ElectionBadge
          selectionMethod={SelectionMethod.RETENTION_ELECTION}
          variant="minimal"
        />

        <ElectionBadge
          selectionMethod={SelectionMethod.MERIT_SELECTION}
          variant="minimal"
        />
      </div>
    </div>
  )
}

/**
 * Example 5: In Judge Header Context
 *
 * Shows how to integrate ElectionBadge into a JudgeHeader component.
 */
export function InJudgeHeaderContext() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">In Judge Header</h2>

      <div className="rounded-2xl border border-border/70 bg-card p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Hon. Jane Smith</h3>
              <p className="text-sm text-muted-foreground">Superior Court Judge</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <ElectionBadge
                selectionMethod={SelectionMethod.ELECTED}
                nextElectionDate="2026-11-03"
                variant="compact"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Example 6: In Directory Grid Card Context
 *
 * Shows how to integrate ElectionBadge into a judge directory card.
 */
export function InDirectoryGridCardContext() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">In Directory Card</h2>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="text-lg font-semibold">Hon. John Doe</h4>
            <ElectionBadge
              selectionMethod={SelectionMethod.RETENTION_ELECTION}
              nextElectionDate="2028-06-07"
              variant="compact"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Superior Court of California, County of Los Angeles
          </p>

          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>15 years experience</span>
            <span>•</span>
            <span>245 decisions</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Example 7: Multiple Judges Comparison
 *
 * Shows how badges can be used in a comparison view.
 */
export function MultipleJudgesComparison() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Judge Comparison</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="font-semibold mb-2">Judge A</h4>
          <ElectionBadge
            selectionMethod={SelectionMethod.ELECTED}
            nextElectionDate="2026-11-03"
            variant="compact"
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="font-semibold mb-2">Judge B</h4>
          <ElectionBadge
            selectionMethod={SelectionMethod.APPOINTED}
            variant="compact"
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="font-semibold mb-2">Judge C</h4>
          <ElectionBadge
            selectionMethod={SelectionMethod.RETENTION_ELECTION}
            nextElectionDate="2025-06-07"
            variant="compact"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Example 8: Responsive Badge Layout
 *
 * Shows how badges adapt to different screen sizes.
 */
export function ResponsiveBadgeLayout() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Responsive Layout</h2>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="font-semibold">Hon. Maria Garcia</h4>
            <p className="text-sm text-muted-foreground">Appellate Court Judge</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ElectionBadge
              selectionMethod={SelectionMethod.MERIT_SELECTION}
              variant="compact"
            />
            <ElectionBadge
              selectionMethod={SelectionMethod.RETENTION_ELECTION}
              nextElectionDate="2027-11-02"
              variant="compact"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * All Examples Component
 *
 * Renders all examples in a single view for comprehensive testing and documentation.
 */
export function AllElectionBadgeExamples() {
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">ElectionBadge Component Examples</h1>
        <p className="text-muted-foreground">
          Comprehensive examples showing various use cases and variants of the ElectionBadge component.
        </p>
      </div>

      <BasicSelectionMethodBadges />
      <DetailedBadgesWithElections />
      <UpForElectionBadges />
      <MinimalBadges />
      <InJudgeHeaderContext />
      <InDirectoryGridCardContext />
      <MultipleJudgesComparison />
      <ResponsiveBadgeLayout />
    </div>
  )
}
