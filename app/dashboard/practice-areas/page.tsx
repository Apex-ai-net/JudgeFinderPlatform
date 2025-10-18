import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ensureCurrentAppUser } from '@/lib/auth/user-mapping'
import { createServiceRoleClient } from '@/lib/supabase/server'
import PracticeAreasDashboard from '@/components/dashboard/PracticeAreasDashboard'

export const dynamic = 'force-dynamic'

async function getUserPracticeAreas(userId: string) {
  const supabase = await createServiceRoleClient()

  try {
    const { data: userData, error } = await supabase
      .from('app_users')
      .select('practice_areas, metadata')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching practice areas:', error)
      return []
    }

    return userData?.practice_areas || []
  } catch (error) {
    console.error('Error fetching practice areas:', error)
    return []
  }
}

export default async function PracticeAreasPage(): Promise<JSX.Element> {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    redirect('/sign-in?redirect_url=/dashboard/practice-areas')
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
      redirect('/sign-in?redirect_url=/dashboard/practice-areas')
    }

    const practiceAreas = await getUserPracticeAreas(userData.id)

    return <PracticeAreasDashboard user={appUser} practiceAreas={practiceAreas} />
  } catch (error) {
    console.error('Error loading practice areas:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Error Loading Practice Areas
          </h1>
          <p className="text-gray-600">
            An error occurred while loading your practice areas. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }
}

export const metadata = {
  title: 'Practice Areas - JudgeFinder.io',
  description: 'Customize your judicial research by practice area',
}
