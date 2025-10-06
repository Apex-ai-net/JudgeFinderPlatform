import type { Metadata } from 'next'
import { aboutMetadata } from './metadata'
import AboutPageClient from './about-client'

export const metadata: Metadata = aboutMetadata
export const dynamic = 'force-dynamic'

export default function AboutPage() {
  return <AboutPageClient />
}
