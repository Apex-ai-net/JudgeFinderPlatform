import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getAdvertiserProfileForUser } from '@/lib/ads/service'
import { CampaignManagementDashboard } from '@/components/dashboard/advertiser/CampaignManagementDashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Campaign Management | JudgeFinder Advertiser Dashboard',
  description: 'Manage your advertising campaigns on JudgeFinder',
}

export default async function CampaignsPage(): Promise<JSX.Element> {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in?redirect=/dashboard/advertiser/campaigns')
  }

  const advertiserProfile = await getAdvertiserProfileForUser(user.id)

  if (!advertiserProfile) {
    redirect('/dashboard/advertiser/onboarding')
  }

  if (advertiserProfile.verification_status !== 'verified') {
    redirect('/dashboard/advertiser/onboarding?step=verification')
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Campaign Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create and manage your advertising campaigns on judge profile pages
        </p>
      </div>

      <CampaignManagementDashboard
        userId={user.id}
        advertiserProfile={{
          id: advertiserProfile.id,
          organization_name: advertiserProfile.firm_name,
          contact_email: advertiserProfile.contact_email,
          bar_number: advertiserProfile.bar_number || null,
          verification_status: advertiserProfile.verification_status,
        }}
      />
    </main>
  )
}
