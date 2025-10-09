'use client'

import { useEffect, useState, useCallback } from 'react'
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from 'react-joyride'
import { X } from 'lucide-react'

interface ProductTourProps {
  tourType: 'dashboard' | 'judge-profile' | 'search' | 'comparison'
  autoStart?: boolean
  onComplete?: () => void
}

const TOUR_STORAGE_KEY = 'judgefinder_tours_completed'

interface ToursCompleted {
  dashboard?: boolean
  'judge-profile'?: boolean
  search?: boolean
  comparison?: boolean
}

const tourSteps: Record<string, Step[]> = {
  dashboard: [
    {
      target: '#search-bar',
      content:
        'Start your research by searching for judges by name, court, or jurisdiction. Try "Smith Orange County" to see it in action.',
      title: 'Search for Judges',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#recent-searches',
      content:
        'Your recent searches are saved here for quick access. Click any to return to previous results.',
      title: 'Recent Searches',
      placement: 'left',
    },
    {
      target: '#bookmarks',
      content: 'Bookmark judges you want to track. Get alerts when their profiles are updated.',
      title: 'Bookmarked Judges',
      placement: 'left',
    },
    {
      target: '#advanced-filters',
      content:
        'Use advanced filters to narrow results by jurisdiction, court type, appointment date, and more.',
      title: 'Advanced Filtering',
      placement: 'bottom',
    },
  ],
  'judge-profile': [
    {
      target: '#profile',
      content:
        'View comprehensive judge information including current position, appointment date, and jurisdiction.',
      title: 'Judge Profile Overview',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#analytics',
      content:
        "Our AI analyzes thousands of cases to show this judge's decision patterns, reversal rates, and settlement preferences.",
      title: 'Judicial Analytics',
      placement: 'top',
    },
    {
      target: '#professional-background',
      content: "Review the judge's professional background, education, and prior legal experience.",
      title: 'Professional Background',
      placement: 'top',
    },
    {
      target: '#recent-decisions',
      content: 'Browse recent decisions and rulings to understand current case patterns.',
      title: 'Recent Decisions',
      placement: 'top',
    },
  ],
  search: [
    {
      target: '#search-bar',
      content:
        'Enter a judge name, court name, or jurisdiction. Our AI-powered search understands natural language queries.',
      title: 'Smart Search',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#search-filters',
      content:
        'Refine your search with filters. Filter by jurisdiction, court type, or practice area.',
      title: 'Search Filters',
      placement: 'left',
    },
    {
      target: '#search-results',
      content: 'Results show key metrics at a glance. Click any judge to view their full profile.',
      title: 'Search Results',
      placement: 'top',
    },
  ],
  comparison: [
    {
      target: '#comparison-tool',
      content:
        'Compare up to 4 judges side-by-side to see how their analytics and backgrounds differ.',
      title: 'Judge Comparison',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#add-judge',
      content: 'Add judges to your comparison by clicking the "Compare" button on any profile.',
      title: 'Adding Judges',
      placement: 'left',
    },
    {
      target: '#comparison-metrics',
      content:
        'View comparative analytics including reversal rates, decision patterns, and case volumes.',
      title: 'Comparison Metrics',
      placement: 'top',
    },
  ],
}

export function ProductTour({
  tourType,
  autoStart = false,
  onComplete,
}: ProductTourProps): JSX.Element {
  const [run, setRun] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])

  useEffect(() => {
    // Check if tour was already completed
    const completedToursStr = localStorage.getItem(TOUR_STORAGE_KEY)
    const completedTours: ToursCompleted = completedToursStr ? JSON.parse(completedToursStr) : {}

    if (!completedTours[tourType]) {
      setSteps(tourSteps[tourType] || [])
      if (autoStart) {
        // Delay to ensure DOM elements are ready
        setTimeout(() => setRun(true), 1000)
      }
    }
  }, [tourType, autoStart])

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action } = data

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false)

        // Mark tour as completed
        const completedToursStr = localStorage.getItem(TOUR_STORAGE_KEY)
        const completedTours: ToursCompleted = completedToursStr
          ? JSON.parse(completedToursStr)
          : {}
        completedTours[tourType] = true
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completedTours))

        // Call completion callback
        if (onComplete) {
          onComplete()
        }

        // Track completion analytics
        if (typeof window !== 'undefined' && 'gtag' in window) {
          // @ts-ignore
          window.gtag('event', 'tour_completed', {
            tour_type: tourType,
            status: status === STATUS.FINISHED ? 'finished' : 'skipped',
          })
        }
      }
    },
    [tourType, onComplete]
  )

  const startTour = useCallback(() => {
    setRun(true)
  }, [])

  const CustomTooltip = ({
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    tooltipProps,
    skipProps,
    isLastStep,
  }: TooltipRenderProps) => (
    <div
      {...tooltipProps}
      className="bg-card border border-border rounded-lg shadow-2xl p-6 max-w-md"
    >
      <div className="flex items-start justify-between mb-3">
        {step.title && <h3 className="text-lg font-semibold text-foreground pr-4">{step.title}</h3>}
        <button
          {...closeProps}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close tour"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="text-sm text-muted-foreground mb-6 leading-relaxed">{step.content}</div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Step {index + 1} of {steps.length}
        </div>
        <div className="flex gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </button>
          )}
          {!isLastStep && (
            <button
              {...skipProps}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip Tour
            </button>
          )}
          <button
            {...primaryProps}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        continuous
        showProgress
        showSkipButton
        disableOverlayClose
        disableCloseOnEsc={false}
        callback={handleJoyrideCallback}
        tooltipComponent={CustomTooltip}
        styles={{
          options: {
            zIndex: 10000,
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          },
          spotlight: {
            backgroundColor: 'transparent',
            border: '2px solid hsl(var(--primary))',
            borderRadius: '8px',
          },
        }}
      />
      {/* Manual tour trigger - can be placed anywhere */}
      <button
        onClick={startTour}
        className="hidden"
        id={`start-${tourType}-tour`}
        aria-label={`Start ${tourType} tour`}
      />
    </>
  )
}

// Hook to check if user has completed tours
export function useTourStatus(): JSX.Element {
  const [completedTours, setCompletedTours] = useState<ToursCompleted>({})

  useEffect(() => {
    const completedToursStr = localStorage.getItem(TOUR_STORAGE_KEY)
    if (completedToursStr) {
      setCompletedTours(JSON.parse(completedToursStr))
    }
  }, [])

  const resetTour = useCallback((tourType: keyof ToursCompleted) => {
    const completedToursStr = localStorage.getItem(TOUR_STORAGE_KEY)
    const completedTours: ToursCompleted = completedToursStr ? JSON.parse(completedToursStr) : {}
    delete completedTours[tourType]
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completedTours))
    setCompletedTours(completedTours)
  }, [])

  const resetAllTours = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    setCompletedTours({})
  }, [])

  return {
    completedTours,
    resetTour,
    resetAllTours,
  }
}
