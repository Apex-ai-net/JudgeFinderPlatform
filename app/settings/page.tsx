import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ProfileSettings } from '@/components/profile/ProfileSettings'
import { ensureCurrentAppUser } from '@/lib/auth/user-mapping'

export const dynamic = 'force-dynamic'

export default async function SettingsPage(): Promise<JSX.Element> {
  try {
    const { userId } = await auth()

    if (!userId) {
      redirect('/sign-in?redirect_url=/settings')
    }

    const user = await currentUser()

    // Validate user data structure
    if (!user) {
      console.error('Settings page: currentUser() returned null for userId:', userId)
      throw new Error('Failed to load user data. Please try signing in again.')
    }

    // Ensure email addresses exist
    if (!user.emailAddresses || user.emailAddresses.length === 0) {
      console.error('Settings page: User object missing email addresses', {
        userId: user.id,
        hasEmailAddresses: Boolean(user.emailAddresses),
        emailCount: user.emailAddresses?.length || 0,
      })
    }

    // Ensure Clerk↔Supabase mapping exists
    // Wrapped in try-catch to prevent Supabase failures from crashing the page
    try {
      await ensureCurrentAppUser()
    } catch (mappingError) {
      // Log the error but don't crash the page
      // The settings page should work even if Supabase mapping fails
      console.error('Settings page: Failed to ensure user mapping (non-fatal):', {
        userId: user.id,
        error: mappingError instanceof Error ? mappingError.message : 'Unknown error',
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      })
    }

    // Serialize user object for client component (only include what's needed and ensure JSON-serializable)
    const serializedUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddresses: user.emailAddresses?.map((email) => ({
        id: email.id,
        emailAddress: email.emailAddress,
      })),
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400">
              Manage your account preferences and notification settings
            </p>
          </div>

          <ProfileSettings user={serializedUser as any} />
        </div>
      </div>
    )
  } catch (error) {
    // Log detailed error information
    console.error('Settings page error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Re-throw to trigger error.tsx
    throw error
  }
}

export const metadata = {
  title: 'Settings - JudgeFinder.io',
  description: 'Manage your account settings and preferences',
}
