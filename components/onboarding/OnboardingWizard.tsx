'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@clerk/nextjs/server'
import { useSafeUser } from '@/lib/auth/safe-clerk-components'
import {
  CheckCircleIcon,
  ArrowRightIcon,
  UserIcon,
  BriefcaseIcon,
  MapPinIcon,
  BellIcon,
  BookmarkIcon,
  XIcon,
} from 'lucide-react'

interface OnboardingWizardProps {
  user?: User | null
  onComplete?: (data: OnboardingData) => void
  onDismiss?: () => void
}

interface OnboardingData {
  profession: string
  useCase: string[]
  jurisdiction: string
  notifications: {
    emailUpdates: boolean
    judgeAlerts: boolean
    weeklyDigest: boolean
  }
}

export function OnboardingWizard({
  user: serverUser,
  onComplete: onCompleteProp,
  onDismiss,
}: OnboardingWizardProps): JSX.Element {
  const { user: clientUser } = useSafeUser()
  const user = clientUser || serverUser
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    profession: '',
    useCase: [],
    jurisdiction: 'CA',
    notifications: {
      emailUpdates: true,
      judgeAlerts: false,
      weeklyDigest: true,
    },
  })

  const professions = [
    { id: 'attorney', label: 'Attorney / Lawyer', icon: BriefcaseIcon },
    { id: 'paralegal', label: 'Paralegal', icon: UserIcon },
    { id: 'litigant', label: 'Self-Represented Litigant', icon: UserIcon },
    { id: 'researcher', label: 'Legal Researcher', icon: BookmarkIcon },
    { id: 'journalist', label: 'Journalist', icon: UserIcon },
    { id: 'student', label: 'Law Student', icon: UserIcon },
    { id: 'other', label: 'Other', icon: UserIcon },
  ]

  const useCases = [
    'Research judges for upcoming cases',
    'Analyze judicial decision patterns',
    'Compare judges across jurisdictions',
    'Track specific case outcomes',
    'Monitor judicial appointments',
    'Academic research',
    'Journalism and transparency',
    'General legal research',
  ]

  const jurisdictions = [
    { code: 'CA', name: 'California' },
    { code: 'NY', name: 'New York' },
    { code: 'TX', name: 'Texas' },
    { code: 'FL', name: 'Florida' },
    { code: 'federal', name: 'Federal Courts' },
  ]

  const handleUseCaseToggle = (useCase: string) => {
    setOnboardingData((prev) => ({
      ...prev,
      useCase: prev.useCase.includes(useCase)
        ? prev.useCase.filter((uc) => uc !== useCase)
        : [...prev.useCase, useCase],
    }))
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // If custom onComplete handler provided, use it instead
      if (onCompleteProp) {
        onCompleteProp(onboardingData)
        return
      }

      // Update user metadata via API
      if (user) {
        await fetch('/api/user/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            onboardingCompleted: true,
            profession: onboardingData.profession,
            useCase: onboardingData.useCase,
            primaryJurisdiction: onboardingData.jurisdiction,
          }),
        })
      }

      // Save preferences to our API
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          default_jurisdiction: onboardingData.jurisdiction,
          email_notifications: onboardingData.notifications.emailUpdates,
          judge_alerts: onboardingData.notifications.judgeAlerts,
          weekly_digest: onboardingData.notifications.weeklyDigest,
        }),
      })

      // Log onboarding completion
      await fetch('/api/user/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activity_type: 'onboarding',
          activity_data: {
            profession: onboardingData.profession,
            useCase: onboardingData.useCase,
            jurisdiction: onboardingData.jurisdiction,
          },
        }),
      })

      router.push('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-lg border border-border/50 p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Dismiss onboarding"
          >
            <XIcon className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of 4
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round((currentStep / 4) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-card rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Profession */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">What's your profession?</h2>
              <p className="text-muted-foreground">This helps us customize your experience</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {professions.map((profession) => {
                const Icon = profession.icon
                return (
                  <button
                    key={profession.id}
                    onClick={() =>
                      setOnboardingData((prev) => ({ ...prev, profession: profession.id }))
                    }
                    className={`flex items-center p-4 rounded-lg border transition-colors ${
                      onboardingData.profession === profession.id
                        ? 'bg-primary/50/20 border-blue-500/50 text-primary'
                        : 'bg-card/50 border-border/50 text-muted-foreground hover:bg-muted-foreground/50'
                    }`}
                  >
                    <Icon className="h-6 w-6 mr-3" />
                    <span className="font-medium">{profession.label}</span>
                    {onboardingData.profession === profession.id && (
                      <CheckCircleIcon className="h-5 w-5 ml-auto text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Use Cases */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">How will you use JudgeFinder?</h2>
              <p className="text-muted-foreground">Select all that apply</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {useCases.map((useCase) => (
                <button
                  key={useCase}
                  onClick={() => handleUseCaseToggle(useCase)}
                  className={`flex items-center p-4 rounded-lg border transition-colors text-left ${
                    onboardingData.useCase.includes(useCase)
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                      : 'bg-card/50 border-border/50 text-muted-foreground hover:bg-muted-foreground/50'
                  }`}
                >
                  <div className="flex-1">
                    <span className="font-medium">{useCase}</span>
                  </div>
                  {onboardingData.useCase.includes(useCase) && (
                    <CheckCircleIcon className="h-5 w-5 text-purple-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Jurisdiction */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Primary jurisdiction</h2>
              <p className="text-muted-foreground">Which jurisdiction do you work in most often?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jurisdictions.map((jurisdiction) => (
                <button
                  key={jurisdiction.code}
                  onClick={() =>
                    setOnboardingData((prev) => ({ ...prev, jurisdiction: jurisdiction.code }))
                  }
                  className={`flex items-center p-4 rounded-lg border transition-colors ${
                    onboardingData.jurisdiction === jurisdiction.code
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-card/50 border-border/50 text-muted-foreground hover:bg-muted-foreground/50'
                  }`}
                >
                  <MapPinIcon className="h-6 w-6 mr-3" />
                  <span className="font-medium">{jurisdiction.name}</span>
                  {onboardingData.jurisdiction === jurisdiction.code && (
                    <CheckCircleIcon className="h-5 w-5 ml-auto text-green-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Notifications */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Notification preferences</h2>
              <p className="text-muted-foreground">Choose how you'd like to stay updated</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg">
                <div className="flex items-center">
                  <BellIcon className="h-6 w-6 text-primary mr-3" />
                  <div>
                    <p className="font-medium text-white">Email Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Platform updates and new features
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onboardingData.notifications.emailUpdates}
                    onChange={(e) =>
                      setOnboardingData((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, emailUpdates: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted-foreground peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg">
                <div className="flex items-center">
                  <BookmarkIcon className="h-6 w-6 text-purple-400 mr-3" />
                  <div>
                    <p className="font-medium text-white">Judge Alerts</p>
                    <p className="text-sm text-muted-foreground">Updates about saved judges</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onboardingData.notifications.judgeAlerts}
                    onChange={(e) =>
                      setOnboardingData((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, judgeAlerts: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted-foreground peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg">
                <div className="flex items-center">
                  <BellIcon className="h-6 w-6 text-green-400 mr-3" />
                  <div>
                    <p className="font-medium text-white">Weekly Digest</p>
                    <p className="text-sm text-muted-foreground">Weekly summary of activity</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onboardingData.notifications.weeklyDigest}
                    onChange={(e) =>
                      setOnboardingData((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, weeklyDigest: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted-foreground peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'bg-card text-muted-foreground cursor-not-allowed'
                : 'bg-card text-white hover:bg-muted-foreground'
            }`}
          >
            Previous
          </button>

          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              disabled={currentStep === 1 && !onboardingData.profession}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStep === 1 && !onboardingData.profession
                  ? 'bg-card text-muted-foreground cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
              }`}
            >
              Next
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isLoading}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
              <CheckCircleIcon className="h-4 w-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
