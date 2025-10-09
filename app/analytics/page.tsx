import type { Metadata } from 'next'
import { analyticsMetadata } from './metadata'
import AnalyticsPageClient from './analytics-client'

export const metadata: Metadata = analyticsMetadata
export const dynamic = 'force-dynamic'

export default function AnalyticsPage(): JSX.Element {
  return <AnalyticsPageClient />
}
