import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ensureCurrentAppUser } from '@/lib/auth/user-mapping'
import { createServiceRoleClient } from '@/lib/supabase/server'
import SavedSearchesDashboard from '@/components/dashboard/SavedSearchesDashboard'

export const dynamic = 'force-dynamic'

async function getUserSavedSearches(userId: string) {
  const supabase = await createServiceRoleClient()

  try {
    const { data: searches, error } = await supabase
      .from('user_saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved searches:', error)
      return []
    }

    return searches || []
  } catch (error) {
    console.error('Error fetching saved searches:', error)
    return []
  }
}

export default async function SavedSearchesPage(): Promise<JSX.Element> {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    redirect('/sign-in?redirect_url=/dashboard/searches')
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
      redirect('/sign-in?redirect_url=/dashboard/searches')
    }

    const searches = await getUserSavedSearches(userData.id)

    return <SavedSearchesDashboard user={appUser} searches={searches} />
  } catch (error) {
    console.error('Error loading saved searches:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Error Loading Searches</h1>
          <p className="text-gray-600">
            An error occurred while loading your saved searches. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }
}

export const metadata = {
  title: 'Saved Searches - JudgeFinder.io',
  description: 'Manage your saved judicial research queries',
}
