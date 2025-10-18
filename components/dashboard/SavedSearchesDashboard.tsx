'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Trash2, ExternalLink, Calendar, Filter } from 'lucide-react'

interface SavedSearch {
  id: string
  search_query: string
  filters?: any
  result_count?: number
  created_at: string
  updated_at: string
}

interface SavedSearchesDashboardProps {
  user: any
  searches: SavedSearch[]
}

export default function SavedSearchesDashboard({
  user,
  searches: initialSearches,
}: SavedSearchesDashboardProps) {
  const [searches, setSearches] = useState<SavedSearch[]>(initialSearches)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (searchId: string) => {
    if (!confirm('Are you sure you want to delete this saved search?')) {
      return
    }

    setDeletingId(searchId)

    try {
      const response = await fetch(`/api/user/saved-searches/${searchId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSearches(searches.filter((s) => s.id !== searchId))
      } else {
        alert('Failed to delete search. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting search:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
          <h1 className="text-4xl font-bold text-gray-900 mt-2">Saved Searches</h1>
          <p className="mt-2 text-gray-600">
            Manage your saved judicial research queries and quickly re-run past searches
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total Searches
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{searches.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  This Month
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {
                    searches.filter((s) => {
                      const date = new Date(s.created_at)
                      const now = new Date()
                      return (
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear()
                      )
                    }).length
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  With Filters
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {searches.filter((s) => s.filters && Object.keys(s.filters).length > 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Filter className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Searches List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Saved Searches</h2>
          </div>

          {searches.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No saved searches yet</h3>
              <p className="text-gray-500 mb-6">
                Start searching for judges and save your queries for quick access later
              </p>
              <Link
                href="/judges"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Judges
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {searches.map((search) => (
                <div key={search.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-base font-medium text-gray-900 truncate">
                            {search.search_query}
                          </p>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(search.created_at)}
                            </span>
                            {search.result_count !== undefined && (
                              <span>{search.result_count} results</span>
                            )}
                            {search.filters && Object.keys(search.filters).length > 0 && (
                              <span className="flex items-center">
                                <Filter className="w-4 h-4 mr-1" />
                                {Object.keys(search.filters).length} filters applied
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center space-x-2 flex-shrink-0">
                      <Link
                        href={`/judges?q=${encodeURIComponent(search.search_query)}${
                          search.filters
                            ? `&filters=${encodeURIComponent(JSON.stringify(search.filters))}`
                            : ''
                        }`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Run Search
                      </Link>
                      <button
                        onClick={() => handleDelete(search.id)}
                        disabled={deletingId === search.id}
                        className="inline-flex items-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/judges"
            className="block p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Search Judges</h3>
                <p className="text-sm text-blue-700 mt-2">
                  Find judges by name, court, or jurisdiction
                </p>
              </div>
              <Search className="w-6 h-6 text-blue-600" />
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="block p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Back to Dashboard</h3>
                <p className="text-sm text-gray-700 mt-2">Return to your main dashboard overview</p>
              </div>
              <ExternalLink className="w-6 h-6 text-gray-600" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
