'use client'

/**
 * Feature Discovery System
 * Tracks user actions, manages feature badges, and implements progressive disclosure
 */

const STORAGE_KEY = 'judgefinder_feature_tracking'

export interface FeatureUsage {
  feature: string
  firstUsed: string
  lastUsed: string
  usageCount: number
}

export interface FeatureTracking {
  searches: number
  profileViews: number
  comparisons: number
  bookmarks: number
  exports: number
  advancedFilters: number
  firstSearchDate?: string
  firstProfileViewDate?: string
  firstComparisonDate?: string
  firstBookmarkDate?: string
  features: FeatureUsage[]
}

/**
 * Get current feature tracking data from localStorage
 */
export function getFeatureTracking(): FeatureTracking {
  if (typeof window === 'undefined') {
    return getDefaultTracking()
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error reading feature tracking:', error)
  }

  return getDefaultTracking()
}

/**
 * Get default tracking object
 */
function getDefaultTracking(): FeatureTracking {
  return {
    searches: 0,
    profileViews: 0,
    comparisons: 0,
    bookmarks: 0,
    exports: 0,
    advancedFilters: 0,
    features: [],
  }
}

/**
 * Save feature tracking data to localStorage
 */
function saveFeatureTracking(tracking: FeatureTracking): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracking))
  } catch (error) {
    console.error('Error saving feature tracking:', error)
  }
}

/**
 * Track a user action
 */
export function trackFeatureUsage(feature: keyof Omit<FeatureTracking, 'features'>): void {
  const tracking = getFeatureTracking()
  const now = new Date().toISOString()

  // Increment counter (safely handle numeric fields)
  if (typeof tracking[feature] === 'number') {
    const trackingAny = tracking as any
    trackingAny[feature] = trackingAny[feature] + 1
  }

  // Track first usage date
  const dateKey = `first${feature.charAt(0).toUpperCase()}${feature.slice(1)}Date` as keyof FeatureTracking
  if (!tracking[dateKey]) {
    ;(tracking as any)[dateKey] = now
  }

  // Update or add feature usage record
  const existingFeature = tracking.features.find((f) => f.feature === feature)
  if (existingFeature) {
    existingFeature.lastUsed = now
    existingFeature.usageCount++
  } else {
    tracking.features.push({
      feature,
      firstUsed: now,
      lastUsed: now,
      usageCount: 1,
    })
  }

  saveFeatureTracking(tracking)

  // Send analytics event if available
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // @ts-ignore
    window.gtag('event', 'feature_used', {
      feature_name: feature,
      usage_count: tracking[feature],
    })
  }
}

/**
 * Check if a feature should show a "New" badge
 */
export function shouldShowNewBadge(feature: keyof Omit<FeatureTracking, 'features'>): boolean {
  const tracking = getFeatureTracking()
  const usageCount = tracking[feature] as number

  // Show badge if feature hasn't been used yet
  return usageCount === 0
}

/**
 * Check if user has completed basic onboarding actions
 */
export function hasCompletedBasicActions(): boolean {
  const tracking = getFeatureTracking()
  return tracking.searches > 0 && tracking.profileViews > 0
}

/**
 * Check if user should see advanced features
 * Progressive disclosure: show advanced features after basics are used
 */
export function shouldShowAdvancedFeatures(): boolean {
  const tracking = getFeatureTracking()

  // Show advanced features after:
  // - At least 3 searches
  // - At least 2 profile views
  // - At least 1 bookmark
  return tracking.searches >= 3 && tracking.profileViews >= 2 && tracking.bookmarks >= 1
}

/**
 * Get features that haven't been used yet
 */
export function getUnusedFeatures(): string[] {
  const tracking = getFeatureTracking()
  const unused: string[] = []

  if (tracking.comparisons === 0) unused.push('comparison')
  if (tracking.bookmarks === 0) unused.push('bookmarks')
  if (tracking.advancedFilters === 0) unused.push('advancedFilters')
  if (tracking.exports === 0) unused.push('exports')

  return unused
}

/**
 * Get user's onboarding progress as a percentage
 */
export function getOnboardingProgress(): number {
  const tracking = getFeatureTracking()
  const milestones = [
    tracking.searches > 0,
    tracking.profileViews > 0,
    tracking.bookmarks > 0,
    tracking.comparisons > 0,
    tracking.advancedFilters > 0,
  ]

  const completed = milestones.filter(Boolean).length
  return Math.round((completed / milestones.length) * 100)
}

/**
 * Get time-to-first-action metric
 */
export function getTimeToFirstSearch(): number | null {
  const tracking = getFeatureTracking()
  if (!tracking.firstSearchDate) return null

  const firstSearch = new Date(tracking.firstSearchDate)
  const accountCreated = new Date() // This would need to come from user metadata

  return Math.round((firstSearch.getTime() - accountCreated.getTime()) / 1000 / 60) // minutes
}

/**
 * Check if feature announcement should be shown
 */
export function shouldShowFeatureAnnouncement(featureId: string): boolean {
  if (typeof window === 'undefined') return false

  const announcementKey = `feature_announcement_${featureId}_dismissed`
  return !localStorage.getItem(announcementKey)
}

/**
 * Dismiss a feature announcement
 */
export function dismissFeatureAnnouncement(featureId: string): void {
  if (typeof window === 'undefined') return

  const announcementKey = `feature_announcement_${featureId}_dismissed`
  localStorage.setItem(announcementKey, 'true')
}

/**
 * Get suggested next action based on usage patterns
 */
export function getSuggestedNextAction(): {
  action: string
  title: string
  description: string
  link: string
} | null {
  const tracking = getFeatureTracking()

  // Suggest searching if no searches yet
  if (tracking.searches === 0) {
    return {
      action: 'search',
      title: 'Try your first search',
      description: 'Search for a judge by name, court, or jurisdiction',
      link: '/dashboard',
    }
  }

  // Suggest viewing a profile if searches done but no views
  if (tracking.searches > 0 && tracking.profileViews === 0) {
    return {
      action: 'view_profile',
      title: 'View a judge profile',
      description: 'Click on any search result to see detailed analytics',
      link: '/judges',
    }
  }

  // Suggest bookmarking
  if (tracking.profileViews >= 2 && tracking.bookmarks === 0) {
    return {
      action: 'bookmark',
      title: 'Bookmark a judge',
      description: 'Save judges for quick access and receive updates',
      link: '/help-center/features#bookmarks',
    }
  }

  // Suggest comparison
  if (tracking.profileViews >= 3 && tracking.comparisons === 0) {
    return {
      action: 'compare',
      title: 'Compare judges',
      description: 'See how judges stack up side-by-side',
      link: '/help-center/features#comparison',
    }
  }

  // Suggest advanced filters
  if (tracking.searches >= 5 && tracking.advancedFilters === 0) {
    return {
      action: 'filters',
      title: 'Try advanced filters',
      description: 'Narrow your search with powerful filtering options',
      link: '/help-center/features#advanced-filters',
    }
  }

  return null
}

/**
 * Record feature discovery milestone for analytics
 */
export function recordMilestone(milestone: string): void {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // @ts-ignore
    window.gtag('event', 'milestone_reached', {
      milestone_name: milestone,
    })
  }

  // Also send to backend for product analytics
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/milestone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        milestone,
        timestamp: new Date().toISOString(),
      }),
    }).catch((error) => {
      console.error('Error recording milestone:', error)
    })
  }
}

/**
 * Reset all feature tracking (for testing)
 */
export function resetFeatureTracking(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Export feature tracking data for analytics
 */
export function exportFeatureTrackingData(): FeatureTracking {
  return getFeatureTracking()
}
