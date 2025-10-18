'use client'

import { useEffect, useState } from 'react'
import { OnboardingWizard } from './OnboardingWizard'

const ONBOARDING_KEY = 'judgefinder_onboarding_completed_v1'
const ONBOARDING_DISMISSED_KEY = 'judgefinder_onboarding_dismissed'

export function OnboardingTrigger(): JSX.Element | null {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if we should show onboarding
    const completed = localStorage.getItem(ONBOARDING_KEY)
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY)

    // Show onboarding if:
    // 1. User hasn't completed it
    // 2. User hasn't dismissed it
    // 3. It's been more than 30 days since dismissal (re-engagement)
    if (!completed) {
      if (!dismissed) {
        // First time visitor - show immediately after a short delay
        const timer = setTimeout(() => {
          setShowOnboarding(true)
        }, 2000) // 2 second delay so user can orient themselves

        return () => clearTimeout(timer)
      } else {
        // Check if dismissed more than 30 days ago
        const dismissedDate = new Date(dismissed)
        const daysSinceDismissal = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)

        if (daysSinceDismissal > 30) {
          // Re-trigger after 30 days
          const timer = setTimeout(() => {
            setShowOnboarding(true)
          }, 5000) // Longer delay for returning users

          return () => clearTimeout(timer)
        }
      }
    }
  }, [])

  const handleComplete = (data: any) => {
    localStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({
        completed: true,
        timestamp: new Date().toISOString(),
        data,
      })
    )
    setShowOnboarding(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, new Date().toISOString())
    setShowOnboarding(false)
  }

  // Don't render anything on server or before mount
  if (!mounted || !showOnboarding) {
    return null
  }

  return <OnboardingWizard onComplete={handleComplete} onDismiss={handleDismiss} />
}
