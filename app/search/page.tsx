import type { Metadata } from 'next'
import { searchMetadata } from './metadata'
import SearchPageClient from './search-client'

export const metadata: Metadata = searchMetadata
export const dynamic = 'force-dynamic'

export default function SearchPage() {
  return <SearchPageClient />
}
