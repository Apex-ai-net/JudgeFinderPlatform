import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ensureCurrentAppUser } from '@/lib/auth/user-mapping'
import { createServiceRoleClient } from '@/lib/supabase/server'
import ActivityHistoryDashboard from '@/components/dashboard/ActivityHistoryDashboard'

export const dynamic = 'force-dynamic'

async function getUserActivity(userId: string) {
  const supabase = await createServiceRoleClient()

  try {
    const { data: activities, error } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching activity:', error)
      return []
    }

    return activities || []
  } catch (error) {
    console.error('Error fetching activity:', error)
    return []
  }
}

export default async function ActivityHistoryPage(): Promise<JSX.Element> {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    redirect('/sign-in?redirect_url=/dashboard/activity')
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
      redirect('/sign-in?redirect_url=/dashboard/activity')
    }

    const activities = await getUserActivity(userData.id)

    return <ActivityHistoryDashboard user={appUser} activities={activities} />
  } catch (error) {
    console.error('Error loading activity history:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Error Loading Activity</h1>
          <p className="text-gray-600">
            An error occurred while loading your activity history. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }
}

export const metadata = {
  title: 'Activity History - JudgeFinder.io',
  description: 'View your complete judicial research activity history',
}
