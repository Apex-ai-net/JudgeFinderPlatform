'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  BookmarkIcon,
  ClockIcon,
  SearchIcon,
  TrendingUpIcon,
  UserIcon,
  BuildingIcon,
  BarChart3Icon,
  StarIcon,
  Megaphone,
} from 'lucide-react'
import AdPurchaseModal from './AdPurchaseModal'

interface SerializedUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  createdAt: number
}

interface UserDashboardProps {
  user: SerializedUser | null
}

interface DashboardStats {
  totalSearches: number
  judgesViewed: number
  bookmarkedJudges: number
  comparisonsRun: number
  recentActivity: number
  daysSinceJoin: number
  memberSince: string
}

interface ApiResponse {
  success: boolean
  stats: DashboardStats
  message: string
}

interface BookmarkJudge {
  id: string
  judge_id: string
  created_at: string
  judges: {
    id: string
    name: string
    court?: string | null
    court_name?: string | null
    jurisdiction?: string | null
    slug?: string | null
  }
}

interface ActivityEntry {
  id?: string
  activity_type: string
  created_at: string
  activity_data?: Record<string, any> | null
  search_query?: string | null
}

export function UserDashboard({ user }: UserDashboardProps): JSX.Element {
  const [stats, setStats] = useState<DashboardStats>({
    totalSearches: 0,
    judgesViewed: 0,
    bookmarkedJudges: 0,
    comparisonsRun: 0,
    recentActivity: 0,
    daysSinceJoin: 0,
    memberSince: '',
  })
  const [loading, setLoading] = useState(true)
  const [showAdPurchaseModal, setShowAdPurchaseModal] = useState(false)
  const [savedLoading, setSavedLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(true)
  const [savedJudges, setSavedJudges] = useState<BookmarkJudge[]>([])
  const [recentSearches, setRecentSearches] = useState<ActivityEntry[]>([])

  const formattedMemberSince = useMemo(() => stats.memberSince || 'N/A', [stats.memberSince])

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()

    if (diffMs < 60_000) return 'Just now'
    const diffMinutes = Math.round(diffMs / 60_000)
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`

    const diffHours = Math.round(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

    const diffDays = Math.round(diffHours / 24)
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  useEffect(() => {
    async function fetchUserStats(): Promise<void> {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch('/api/user/stats')
        if (response.ok) {
          const data: ApiResponse = await response.json()
          if (data.success) {
            setStats(data.stats)
          }
        } else if (response.status === 401) {
          setStats((prev) => ({ ...prev, memberSince: '', daysSinceJoin: 0 }))
        }
      } catch (error) {
        console.error('Failed to fetch user stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserStats()
  }, [user])

  useEffect(() => {
    let isMounted = true

    const fetchSavedJudges = async () => {
      if (!user) {
        if (isMounted) {
          setSavedJudges([])
          setSavedLoading(false)
        }
        return
      }

      try {
        setSavedLoading(true)
        const response = await fetch('/api/user/bookmarks')
        if (!isMounted) return

        if (response.ok) {
          const data = await response.json()
          const bookmarks: BookmarkJudge[] = data.bookmarks || []
          setSavedJudges(bookmarks.slice(0, 3))
        } else if (response.status === 401) {
          setSavedJudges([])
        }
      } catch (error) {
        console.error('Failed to fetch saved judges:', error)
      } finally {
        if (isMounted) {
          setSavedLoading(false)
        }
      }
    }

    const fetchRecentSearches = async () => {
      if (!user) {
        if (isMounted) {
          setRecentSearches([])
          setSearchLoading(false)
        }
        return
      }

      try {
        setSearchLoading(true)
        const response = await fetch('/api/user/activity?limit=5&type=search')
        if (!isMounted) return

        if (response.ok) {
          const data = await response.json()
          const activities: ActivityEntry[] = data.activity || []
          setRecentSearches(activities)
        } else if (response.status === 401) {
          setRecentSearches([])
        }
      } catch (error) {
        console.error('Failed to fetch recent searches:', error)
      } finally {
        if (isMounted) {
          setSearchLoading(false)
        }
      }
    }

    fetchSavedJudges()
    fetchRecentSearches()

    return () => {
      isMounted = false
    }
  }, [user])

  const renderSavedJudges = () => {
    if (savedLoading) {
      return (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 bg-card/30 rounded-lg animate-pulse"
            >
              <div className="w-full space-y-2">
                <div className="h-4 bg-muted-foreground/60 rounded" />
                <div className="h-3 bg-muted-foreground/40 rounded w-1/2" />
              </div>
              <StarIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
        </div>
      )
    }

    if (!savedJudges.length) {
      return (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No saved judges yet. Bookmark judges to see them here.
        </div>
      )
    }

    return savedJudges.map((bookmark) => {
      const judge = bookmark.judges
      const courtLabel = judge.court_name || judge.court || 'Court information unavailable'

      return (
        <div
          key={bookmark.id}
          className="flex items-center justify-between p-3 bg-card/30 rounded-lg"
        >
          <div>
            <p className="font-medium text-foreground">{judge.name}</p>
            <p className="text-sm text-muted-foreground">{courtLabel}</p>
          </div>
          <StarIcon className="h-5 w-5 text-warning" />
        </div>
      )
    })
  }

  const renderRecentSearches = () => {
    if (searchLoading) {
      return (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 bg-card/30 rounded-lg animate-pulse"
            >
              <div className="w-full space-y-2">
                <div className="h-4 bg-muted-foreground/60 rounded" />
                <div className="h-3 bg-muted-foreground/40 rounded w-1/2" />
              </div>
              <SearchIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
        </div>
      )
    }

    if (!recentSearches.length) {
      return (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No recent searches yet. Start exploring judges and courts to see them here.
        </div>
      )
    }

    return recentSearches.map((activity, index) => {
      const query = activity.search_query || activity.activity_data?.query || 'Search'
      const context =
        activity.activity_data?.context ||
        activity.activity_data?.jurisdiction ||
        activity.activity_data?.court_name ||
        ''

      return (
        <div
          key={activity.id ?? index}
          className="flex items-center justify-between p-3 bg-card/30 rounded-lg"
        >
          <div>
            <p className="font-medium text-white">{query}</p>
            <p className="text-sm text-muted-foreground">
              {context ? `${context} • ` : ''}
              {formatRelativeTime(activity.created_at)}
            </p>
          </div>
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )
    })
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookmarkIcon className="h-8 w-8 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Saved Judges</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : stats.bookmarkedJudges}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <SearchIcon className="h-8 w-8 text-success" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Searches</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : stats.totalSearches}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUpIcon className="h-8 w-8 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Judges Viewed</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : stats.judgesViewed}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-warning" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Days Active</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : stats.daysSinceJoin}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Buy Ad Space - Featured Button */}
          <button
            onClick={() => setShowAdPurchaseModal(true)}
            className="flex items-center p-4 bg-gradient-to-r from-primary to-primary/90 rounded-lg border border-primary hover:from-primary/90 hover:to-primary/80 transition-all transform hover:scale-105 group shadow-lg"
          >
            <Megaphone className="h-6 w-6 text-primary-foreground mr-3" />
            <div className="text-left">
              <p className="font-medium text-primary-foreground">Buy Ad Space</p>
              <p className="text-sm text-primary-foreground/80">Promote your firm on judge profiles</p>
            </div>
          </button>

          <Link
            href="/judges"
            className="flex items-center p-4 bg-card/50 rounded-lg border border-border/50 hover:bg-muted-foreground/50 transition-colors group"
          >
            <UserIcon className="h-6 w-6 text-primary mr-3" />
            <div>
              <p className="font-medium text-foreground group-hover:text-primary">Browse Judges</p>
              <p className="text-sm text-muted-foreground">Explore California judges statewide</p>
            </div>
          </Link>

          <Link
            href="/courts"
            className="flex items-center p-4 bg-card/50 rounded-lg border border-border/50 hover:bg-muted-foreground/50 transition-colors group"
          >
            <BuildingIcon className="h-6 w-6 text-success mr-3" />
            <div>
              <p className="font-medium text-foreground group-hover:text-success">Browse Courts</p>
              <p className="text-sm text-muted-foreground">Search courts across California</p>
            </div>
          </Link>

          <Link
            href="/search"
            className="flex items-center p-4 bg-card/50 rounded-lg border border-border/50 hover:bg-muted-foreground/50 transition-colors group"
          >
            <SearchIcon className="h-6 w-6 text-primary mr-3" />
            <div>
              <p className="font-medium text-foreground group-hover:text-primary">Advanced Search</p>
              <p className="text-sm text-muted-foreground">Find specific judges and cases</p>
            </div>
          </Link>

          <Link
            href="/compare"
            className="flex items-center p-4 bg-card/50 rounded-lg border border-border/50 hover:bg-muted-foreground/50 transition-colors group"
          >
            <BarChart3Icon className="h-6 w-6 text-warning mr-3" />
            <div>
              <p className="font-medium text-foreground group-hover:text-warning">Compare Judges</p>
              <p className="text-sm text-muted-foreground">Analyze judicial patterns</p>
            </div>
          </Link>

          <Link
            href="/profile"
            className="flex items-center p-4 bg-card/50 rounded-lg border border-border/50 hover:bg-muted-foreground/50 transition-colors group"
          >
            <UserIcon className="h-6 w-6 text-primary mr-3" />
            <div>
              <p className="font-medium text-white group-hover:text-primary">My Profile</p>
              <p className="text-sm text-muted-foreground">Manage account settings</p>
            </div>
          </Link>

          <Link
            href="/dashboard/bookmarks"
            className="flex items-center p-4 bg-card/50 rounded-lg border border-border/50 hover:bg-muted-foreground/50 transition-colors group"
          >
            <BookmarkIcon className="h-6 w-6 text-warning mr-3" />
            <div>
              <p className="font-medium text-foreground group-hover:text-warning">Saved Judges</p>
              <p className="text-sm text-muted-foreground">View bookmarked judges</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Saved Judges */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recently Saved</h2>
            <Link href="/dashboard/bookmarks" className="text-primary hover:text-primary/80 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-3">{renderSavedJudges()}</div>
        </div>

        {/* Recent Searches */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Searches</h2>
            <Link href="/search" className="text-primary hover:text-primary/80 text-sm">
              New Search
            </Link>
          </div>
          <div className="space-y-3">{renderRecentSearches()}</div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
            <p className="text-foreground">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Member Since</p>
            <p className="text-foreground">{loading ? 'Loading...' : formattedMemberSince}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Account Type</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
              Free Account
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Last Login</p>
            <p className="text-foreground">Today</p>
          </div>
        </div>
      </div>

      {/* Ad Purchase Modal */}
      {showAdPurchaseModal && (
        <AdPurchaseModal onClose={() => setShowAdPurchaseModal(false)} userId={user?.id || ''} />
      )}
    </div>
  )
}
