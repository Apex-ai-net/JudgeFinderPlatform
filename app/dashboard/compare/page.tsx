import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ensureCurrentAppUser } from '@/lib/auth/user-mapping'
import { createServiceRoleClient } from '@/lib/supabase/server'
import JudgeCompareDashboard from '@/components/dashboard/JudgeCompareDashboard'

export const dynamic = 'force-dynamic'

async function getUserComparisons(userId: string) {
  const supabase = await createServiceRoleClient()

  try {
    // Get user's bookmarked judges for comparison
    const { data: bookmarks, error } = await supabase
      .from('user_bookmarks')
      .select(
        `
        *,
        judges (
          id,
          name,
          slug,
          court_name,
          total_cases,
          metadata
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching bookmarked judges:', error)
      return []
    }

    return bookmarks || []
  } catch (error) {
    console.error('Error fetching comparisons:', error)
    return []
  }
}

export default async function DashboardComparePage(): Promise<JSX.Element> {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    redirect('/sign-in?redirect_url=/dashboard/compare')
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
      redirect('/sign-in?redirect_url=/dashboard/compare')
    }

    const bookmarkedJudges = await getUserComparisons(userData.id)

    return <JudgeCompareDashboard user={appUser} bookmarkedJudges={bookmarkedJudges} />
  } catch (error) {
    console.error('Error loading compare dashboard:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Error Loading Compare</h1>
          <p className="text-gray-600">
            An error occurred while loading the comparison view. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }
}

export const metadata = {
  title: 'Compare Judges - JudgeFinder.io',
  description: 'Compare bookmarked judges side-by-side',
}
