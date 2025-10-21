'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Scale, Check, Plus, X } from 'lucide-react'
import { SkipLink } from '@/components/ui/SkipLink'

const AVAILABLE_PRACTICE_AREAS = [
  {
    id: 'criminal',
    name: 'Criminal Law',
    icon: '⚖️',
    description: 'Criminal defense and prosecution',
  },
  {
    id: 'civil',
    name: 'Civil Litigation',
    icon: '📋',
    description: 'Civil disputes and litigation',
  },
  {
    id: 'family',
    name: 'Family Law',
    icon: '👨‍👩‍👧',
    description: 'Divorce, custody, and family matters',
  },
  {
    id: 'employment',
    name: 'Employment Law',
    icon: '💼',
    description: 'Workplace disputes and labor law',
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon: '🏠',
    description: 'Property disputes and transactions',
  },
  {
    id: 'probate',
    name: 'Probate & Estate',
    icon: '📜',
    description: 'Wills, trusts, and estate planning',
  },
  {
    id: 'personal-injury',
    name: 'Personal Injury',
    icon: '🏥',
    description: 'Injury claims and malpractice',
  },
  {
    id: 'bankruptcy',
    name: 'Bankruptcy',
    icon: '💰',
    description: 'Debt relief and reorganization',
  },
  {
    id: 'immigration',
    name: 'Immigration',
    icon: '✈️',
    description: 'Immigration and naturalization',
  },
  {
    id: 'intellectual-property',
    name: 'Intellectual Property',
    icon: '💡',
    description: 'Patents, trademarks, and copyrights',
  },
  {
    id: 'environmental',
    name: 'Environmental Law',
    icon: '🌳',
    description: 'Environmental compliance and litigation',
  },
  {
    id: 'corporate',
    name: 'Corporate Law',
    icon: '🏢',
    description: 'Business law and transactions',
  },
]

interface PracticeAreasDashboardProps {
  user: any
  practiceAreas: string[]
}

export default function PracticeAreasDashboard({
  user,
  practiceAreas: initialAreas,
}: PracticeAreasDashboardProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>(initialAreas || [])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const toggleArea = (areaId: string) => {
    setSelectedAreas((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    )
    setSaveMessage(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch('/api/user/practice-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_areas: selectedAreas }),
      })

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Practice areas saved successfully!' })
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' })
      }
    } catch (error) {
      console.error('Error saving practice areas:', error)
      setSaveMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <SkipLink />
      <main
        id="main-content"
        role="main"
        className="min-h-screen bg-background"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <Link
              href="/dashboard"
              className="text-sm text-primary hover:text-primary/80 mb-4 inline-flex items-center"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-foreground mt-2">Practice Areas</h1>
            <p className="mt-2 text-muted-foreground">
              Select your practice areas to customize your judicial research experience
            </p>
          </header>

          {/* Save Message */}
          {saveMessage && (
            <div
              id="save-message"
              role={saveMessage.type === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={`mb-6 p-4 rounded-lg ${
                saveMessage.type === 'success'
                  ? 'bg-success/10 border border-success/30 text-success'
                  : 'bg-destructive/10 border border-destructive/30 text-destructive'
              }`}
            >
              <p className="flex items-center">
                {saveMessage.type === 'success' ? (
                  <Check className="w-5 h-5 mr-2" aria-hidden="true" />
                ) : (
                  <X className="w-5 h-5 mr-2" aria-hidden="true" />
                )}
                {saveMessage.text}
              </p>
            </div>
          )}

          {/* Selected Count */}
          <section aria-labelledby="selection-summary-heading">
            <h2 id="selection-summary-heading" className="sr-only">
              Selection Summary
            </h2>
            <div className="mb-6 bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Practice Areas</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{selectedAreas.length}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  aria-busy={isSaving}
                  aria-describedby={saveMessage ? 'save-message' : undefined}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </section>

          {/* Practice Areas Grid */}
          <section aria-labelledby="practice-areas-heading">
            <h2 id="practice-areas-heading" className="sr-only">
              Available Practice Areas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AVAILABLE_PRACTICE_AREAS.map((area) => {
                const isSelected = selectedAreas.includes(area.id)
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleArea(area.id)}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? 'Deselect' : 'Select'} ${area.name}`}
                    className={`relative p-6 rounded-xl border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border bg-card hover:border-border/80 hover:shadow-sm'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">{area.icon}</div>
                      <div className="flex-1">
                        <h3
                          className={`font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}
                        >
                          {area.name}
                        </h3>
                        <p
                          className={`text-sm mt-1 ${isSelected ? 'text-primary/80' : 'text-muted-foreground'}`}
                        >
                          {area.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Benefits Section */}
            <div className="mt-12 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/30 p-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Why Select Practice Areas?</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Scale className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Customized Results</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get judge recommendations relevant to your practice areas
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plus className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Better Insights</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      See analytics specific to your areas of legal practice
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
