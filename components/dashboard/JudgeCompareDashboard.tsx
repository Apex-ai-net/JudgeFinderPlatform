'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Scale, ExternalLink, TrendingUp, FileText, Plus, X } from 'lucide-react'

interface Judge {
  id: string
  name: string
  slug: string
  court_name: string
  total_cases: number
  metadata?: any
}

interface JudgeCompareDashboardProps {
  user: any
  bookmarkedJudges: any[]
}

export default function JudgeCompareDashboard({
  user,
  bookmarkedJudges,
}: JudgeCompareDashboardProps) {
  const [selectedJudges, setSelectedJudges] = useState<Judge[]>([])

  const toggleJudge = (judge: Judge) => {
    if (selectedJudges.find((j) => j.id === judge.id)) {
      setSelectedJudges(selectedJudges.filter((j) => j.id !== judge.id))
    } else if (selectedJudges.length < 3) {
      setSelectedJudges([...selectedJudges, judge])
    }
  }

  const isSelected = (judgeId: string) => selectedJudges.some((j) => j.id === judgeId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-2">Compare Judges</h1>
          <p className="mt-2 text-gray-600">
            Select up to 3 bookmarked judges to compare side-by-side
          </p>
        </div>

        {/* Selection Bar */}
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Selected ({selectedJudges.length}/3)
            </h2>
            {selectedJudges.length > 0 && (
              <button
                onClick={() => setSelectedJudges([])}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            )}
          </div>

          {selectedJudges.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No judges selected. Choose from your bookmarks below.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedJudges.map((judge) => (
                <div
                  key={judge.id}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{judge.name}</p>
                    <p className="text-sm text-gray-600 truncate">{judge.court_name}</p>
                  </div>
                  <button
                    onClick={() => toggleJudge(judge)}
                    className="ml-2 text-blue-600 hover:text-blue-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedJudges.length >= 2 && (
            <Link
              href={`/compare?judges=${selectedJudges.map((j) => j.slug).join(',')}`}
              className="mt-4 block w-full py-3 bg-blue-600 text-white text-center rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Scale className="w-5 h-5 inline-block mr-2" />
              Compare Selected Judges
            </Link>
          )}
        </div>

        {/* Bookmarked Judges List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Bookmarked Judges</h2>
          </div>

          {bookmarkedJudges.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Scale className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookmarked judges yet</h3>
              <p className="text-gray-500 mb-6">
                Bookmark judges to compare their patterns and rulings
              </p>
              <Link
                href="/judges"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Browse Judges
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {bookmarkedJudges.map((bookmark) => {
                const judge = bookmark.judges
                if (!judge) return null

                const selected = isSelected(judge.id)
                const canSelect = selectedJudges.length < 3 || selected

                return (
                  <div
                    key={bookmark.id}
                    className={`px-6 py-4 transition-colors ${
                      selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => canSelect && toggleJudge(judge)}
                            disabled={!canSelect}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <div className="flex-1">
                            <p className="text-base font-medium text-gray-900">{judge.name}</p>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span>{judge.court_name}</span>
                              {judge.total_cases > 0 && (
                                <span className="flex items-center">
                                  <FileText className="w-4 h-4 mr-1" />
                                  {judge.total_cases.toLocaleString()} cases
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/judges/${judge.slug}`}
                        className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Profile
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
          <h2 className="text-lg font-semibold text-purple-900 mb-3">
            <TrendingUp className="w-5 h-5 inline-block mr-2" />
            Comparison Features
          </h2>
          <ul className="space-y-2 text-sm text-purple-700">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Compare ruling patterns across different case types</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Analyze decision-making timelines and trends</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>View side-by-side bias analytics and confidence scores</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Export comparison reports for case preparation</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
