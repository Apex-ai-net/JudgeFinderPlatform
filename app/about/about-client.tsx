'use client'

import HeroSection from '@/components/about/HeroSection'
import OfferGrid from '@/components/about/OfferGrid'
import UserTypes from '@/components/about/UserTypes'
import FeaturesShowcase from '@/components/about/FeaturesShowcase'
import WhyItMatters from '@/components/about/WhyItMatters'
import TrustIndicators from '@/components/about/TrustIndicators'
import CTASection from '@/components/about/CTASection'

export default function AboutPageClient(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <HeroSection />
      <OfferGrid />
      <UserTypes />
      <FeaturesShowcase />
      <WhyItMatters />
      <TrustIndicators />
      <CTASection />
    </div>
  )
}
