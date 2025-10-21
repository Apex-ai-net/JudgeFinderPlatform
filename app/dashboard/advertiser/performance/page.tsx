import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getAdvertiserProfileForUser } from '@/lib/ads/service'
import { PerformanceAnalyticsDashboard } from '@/components/dashboard/advertiser/PerformanceAnalyticsDashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Performance Analytics | JudgeFinder Advertiser Dashboard',
  description: 'View performance metrics and analytics for your advertising campaigns',
}

export default async function PerformancePage(): Promise<JSX.Element> {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in?redirect=/dashboard/advertiser/performance')
  }

  const advertiserProfile = await getAdvertiserProfileForUser(user.id)

  if (!advertiserProfile) {
    redirect('/dashboard/advertiser/onboarding')
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Performance Analytics
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track your campaign performance with detailed metrics and insights
        </p>
      </div>

      <PerformanceAnalyticsDashboard userId={user.id} />
    </main>
  )
}
