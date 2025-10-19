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
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mt-2">Practice Areas</h1>
            <p className="mt-2 text-gray-600">
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
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
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
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Selected Practice Areas</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{selectedAreas.length}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  aria-busy={isSaving}
                  aria-describedby={saveMessage ? 'save-message' : undefined}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                    className={`relative p-6 rounded-xl border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" aria-hidden="true" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">{area.icon}</div>
                      <div className="flex-1">
                        <h3
                          className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}
                        >
                          {area.name}
                        </h3>
                        <p
                          className={`text-sm mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}
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
            <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8">
              <h2 className="text-2xl font-bold text-blue-900 mb-4">Why Select Practice Areas?</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Scale className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">Customized Results</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Get judge recommendations relevant to your practice areas
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plus className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">Better Insights</h3>
                    <p className="text-sm text-blue-700 mt-1">
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
