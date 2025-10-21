import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getAdvertiserProfileForUser } from '@/lib/ads/service'
import { AdCreativeManager } from '@/components/dashboard/advertiser/AdCreativeManager'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ad Creative | JudgeFinder Advertiser Dashboard',
  description: 'Manage your advertising creative assets on JudgeFinder',
}

export default async function AdCreativePage(): Promise<JSX.Element> {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in?redirect=/dashboard/advertiser/creative')
  }

  const advertiserProfile = await getAdvertiserProfileForUser(user.id)

  if (!advertiserProfile) {
    redirect('/dashboard/advertiser/onboarding')
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Ad Creative Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Upload your firm logo and create compelling ad content to attract potential clients
        </p>
      </div>

      <AdCreativeManager
        advertiserProfile={{
          id: advertiserProfile.id,
          firm_name: advertiserProfile.firm_name,
          logo_url: advertiserProfile.logo_url || null,
          description: advertiserProfile.description || null,
        }}
      />
    </main>
  )
}
