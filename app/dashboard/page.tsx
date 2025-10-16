import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ensureCurrentAppUser } from '@/lib/auth/user-mapping'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getUserStats(userId: string): Promise<any> {
  const supabase = await createServiceRoleClient()

  // Get user's bookmarks count
  const { count: bookmarksCount } = await supabase
    .from('user_bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Get user's recent activity
  const { data: recentActivity } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get user's saved searches
  const { count: savedSearchesCount } = await supabase
    .from('user_saved_searches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return {
    bookmarksCount: bookmarksCount || 0,
    recentActivity: recentActivity || [],
    savedSearchesCount: savedSearchesCount || 0,
  }
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in?redirect_url=/dashboard')
  }

  const appUser = await ensureCurrentAppUser()
  const stats = await getUserStats(userId)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {appUser?.full_name || appUser?.email || 'User'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bookmarked Judges</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.bookmarksCount}</p>
              </div>
              <svg className="w-12 h-12 text-blue-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14l-5-2.18L7 17V9h10v8z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saved Searches</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.savedSearchesCount}</p>
              </div>
              <svg className="w-12 h-12 text-green-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Activities</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.recentActivity.length}
                </p>
              </div>
              <svg className="w-12 h-12 text-purple-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/judges"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Search Judges
            </Link>
            <Link
              href="/compare"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Compare Judges
            </Link>
            <Link
              href="/settings"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Account Settings
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 pb-3 border-b border-gray-200 last:border-0"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {activity.activity_type === 'search' && 'Searched for judges'}
                      {activity.activity_type === 'view' && 'Viewed judge profile'}
                      {activity.activity_type === 'bookmark' && 'Bookmarked a judge'}
                      {activity.activity_type === 'compare' && 'Compared judges'}
                    </p>
                    {activity.search_query && (
                      <p className="text-sm text-gray-500">Query: {activity.search_query}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent activity to display.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Dashboard - JudgeFinder.io',
  description: 'Your personal dashboard for JudgeFinder',
}
