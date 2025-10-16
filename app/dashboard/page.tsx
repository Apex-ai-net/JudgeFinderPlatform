import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ensureCurrentAppUser } from '@/lib/auth/user-mapping'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getUserRole, getDashboardDataByRole } from '@/lib/auth/user-roles'
import { getDashboardJudgeAnalytics } from '@/lib/analytics/judge-dashboard-analytics'
import LegalProfessionalDashboard from '@/components/dashboard/LegalProfessionalDashboard'
import AdvertiserDashboard from '@/components/dashboard/AdvertiserDashboard'

export const dynamic = 'force-dynamic'

async function getUserStats(userId: string): Promise<any> {
  const supabase = await createServiceRoleClient()

  try {
    // Get user's bookmarks count
    const { count: bookmarksCount, error: bookmarkError } = await supabase
      .from('user_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get user's recent activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get user's saved searches
    const { count: savedSearchesCount, error: searchError } = await supabase
      .from('user_saved_searches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Log any errors but don't fail completely
    if (bookmarkError) console.warn('Error fetching bookmarks:', bookmarkError)
    if (activityError) console.warn('Error fetching activity:', activityError)
    if (searchError) console.warn('Error fetching saved searches:', searchError)

    return {
      bookmarksCount: bookmarksCount || 0,
      recentActivity: recentActivity || [],
      savedSearchesCount: savedSearchesCount || 0,
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return {
      bookmarksCount: 0,
      recentActivity: [],
      savedSearchesCount: 0,
    }
  }
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    redirect('/sign-in?redirect_url=/dashboard')
  }

  try {
    const appUser = await ensureCurrentAppUser()

    // Get user ID from Supabase
    const supabase = await createServiceRoleClient()
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user:', userError)
      redirect('/sign-in?redirect_url=/dashboard')
    }

    // Detect user role (excludes admin - admins have separate /admin route)
    const roleInfo = await getUserRole(userData.id, clerkUserId)

    // Get role-specific dashboard data
    const dashboardData = await getDashboardDataByRole(userData.id, roleInfo.role)
    const stats = await getUserStats(userData.id)

    // Get judge analytics if legal professional
    let judgeAnalytics = null
    if (roleInfo.isLegalProfessional) {
      judgeAnalytics = await getDashboardJudgeAnalytics(userData.id)
    }

    // Route to appropriate dashboard based on user role
    if (roleInfo.isAdvertiser) {
      return (
        <AdvertiserDashboard
          user={appUser}
          roleInfo={roleInfo}
          dashboardData={dashboardData}
          stats={stats}
        />
      )
    }

    // Default to legal professional dashboard
    return (
      <LegalProfessionalDashboard
        user={appUser}
        roleInfo={roleInfo}
        dashboardData={dashboardData}
        stats={stats}
        judgeAnalytics={judgeAnalytics}
      />
    )
  } catch (error) {
    console.error('Error loading dashboard:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Error Loading Dashboard</h1>
          <p className="text-gray-600">
            An error occurred while loading your dashboard. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }
}

export const metadata = {
  title: 'Dashboard - JudgeFinder.io',
  description: 'Your personal dashboard for JudgeFinder',
}
