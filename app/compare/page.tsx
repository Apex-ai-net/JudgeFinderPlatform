import type { Metadata } from 'next'
import { compareMetadata } from './metadata'
import ComparePageClient from './compare-client'

export const metadata: Metadata = compareMetadata

export default function ComparePage(): JSX.Element {
  return <ComparePageClient />
}
