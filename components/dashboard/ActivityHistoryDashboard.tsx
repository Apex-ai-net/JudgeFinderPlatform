'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Activity,
  Search,
  Eye,
  Bookmark,
  GitCompare,
  Calendar,
  Filter,
  TrendingUp,
} from 'lucide-react'

interface UserActivity {
  id: string
  activity_type: 'search' | 'view' | 'bookmark' | 'compare'
  entity_type?: string
  entity_id?: string
  search_query?: string
  metadata?: any
  created_at: string
}

interface ActivityHistoryDashboardProps {
  user: any
  activities: UserActivity[]
}

const ACTIVITY_TYPES = {
  search: { icon: Search, label: 'Search', color: 'blue' },
  view: { icon: Eye, label: 'View', color: 'purple' },
  bookmark: { icon: Bookmark, label: 'Bookmark', color: 'green' },
  compare: { icon: GitCompare, label: 'Compare', color: 'orange' },
}

export default function ActivityHistoryDashboard({
  user,
  activities: initialActivities,
}: ActivityHistoryDashboardProps) {
  const [selectedType, setSelectedType] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  const filteredActivities = useMemo(() => {
    let filtered = initialActivities

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((a) => a.activity_type === selectedType)
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      const cutoff = new Date()

      switch (dateFilter) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0)
          break
        case 'week':
          cutoff.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoff.setMonth(now.getMonth() - 1)
          break
      }

      filtered = filtered.filter((a) => new Date(a.created_at) >= cutoff)
    }

    return filtered
  }, [initialActivities, selectedType, dateFilter])

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return {
      total: initialActivities.length,
      today: initialActivities.filter((a) => new Date(a.created_at) >= today).length,
      searches: initialActivities.filter((a) => a.activity_type === 'search').length,
      views: initialActivities.filter((a) => a.activity_type === 'view').length,
    }
  }, [initialActivities])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const getActivityIcon = (type: string) => {
    const config = ACTIVITY_TYPES[type as keyof typeof ACTIVITY_TYPES]
    if (!config) return Activity
    return config.icon
  }

  const getActivityColor = (type: string) => {
    const config = ACTIVITY_TYPES[type as keyof typeof ACTIVITY_TYPES]
    return config?.color || 'gray'
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
          <h1 className="text-4xl font-bold text-gray-900 mt-2">Activity History</h1>
          <p className="mt-2 text-gray-600">
            Complete history of your judicial research activities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total Activities
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.today}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Searches
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.searches}</p>
              </div>
              <Search className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Profile Views
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.views}</p>
              </div>
              <Eye className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline-block mr-1" />
                Activity Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Activities</option>
                <option value="search">Searches</option>
                <option value="view">Profile Views</option>
                <option value="bookmark">Bookmarks</option>
                <option value="compare">Comparisons</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline-block mr-1" />
                Time Period
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity ({filteredActivities.length})
            </h2>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
              <p className="text-gray-500">
                {selectedType !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start searching for judges to see your activity here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredActivities.map((activity) => {
                const Icon = getActivityIcon(activity.activity_type)
                const color = getActivityColor(activity.activity_type)

                return (
                  <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      <div
                        className={`w-10 h-10 bg-${color}-100 rounded-full flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={`w-5 h-5 text-${color}-600`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.activity_type === 'search' && 'Searched for judges'}
                          {activity.activity_type === 'view' && 'Viewed judge profile'}
                          {activity.activity_type === 'bookmark' && 'Bookmarked a judge'}
                          {activity.activity_type === 'compare' && 'Compared judges'}
                        </p>

                        {activity.search_query && (
                          <p className="text-sm text-gray-600 mt-1 truncate">
                            Query: <span className="font-medium">{activity.search_query}</span>
                          </p>
                        )}

                        {activity.metadata && activity.metadata.judge_name && (
                          <p className="text-sm text-gray-600 mt-1">
                            Judge:{' '}
                            <span className="font-medium">{activity.metadata.judge_name}</span>
                          </p>
                        )}

                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
