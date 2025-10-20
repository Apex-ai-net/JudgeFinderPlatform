'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Target,
  TrendingUp,
  Shield,
  BarChart3,
  Check,
  Zap,
  Users,
  Lock,
  ChevronRight,
  ExternalLink,
  Clock,
  Award,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const AdvertisingPreviewModal = dynamic(
  () => import('@/components/advertising/AdvertisingPreviewModal'),
  { ssr: false }
)

const howItWorks = [
  {
    step: 1,
    title: 'Select Your Judge Profiles',
    description:
      'Choose federal or state judge profiles that align with your practice areas and target jurisdiction.',
    icon: Target,
  },
  {
    step: 2,
    title: 'Get Verified with Your Bar Number',
    description:
      'We verify all advertisers through the California State Bar to ensure ethical compliance and transparency.',
    icon: Shield,
  },
  {
    step: 3,
    title: 'Start Advertising Instantly',
    description:
      'Your ad goes live within 24 hours of verification. Track performance with real-time analytics.',
    icon: Zap,
  },
]

const valueProps = [
  {
    icon: Target,
    title: 'Targeted Reach',
    description: 'Connect with attorneys actively researching judges for their cases',
  },
  {
    icon: BarChart3,
    title: 'High ROI',
    description: 'Track impressions, clicks, and conversions with detailed analytics dashboard',
  },
  {
    icon: Award,
    title: 'Limited Inventory',
    description: 'Only 2-3 advertising slots per judge profile for maximum visibility',
  },
]

const federalFeatures = [
  'Premium placement on federal judge profiles',
  'Higher visibility for complex federal cases',
  'Reach attorneys handling federal litigation',
  'Advanced analytics and reporting',
  'Priority customer support',
  'Bar verification badge displayed',
]

const stateFeatures = [
  'Prominent placement on state judge profiles',
  'Target local attorneys and litigants',
  'High volume of state court searches',
  'Detailed performance metrics',
  'Email support included',
  'California State Bar verification',
]

const faqs = [
  {
    question: 'What is bar verification?',
    answer:
      'All advertisers must provide their California State Bar number, which we verify to ensure ethical compliance with California Rules of Professional Conduct. Your bar status link is displayed on your advertisement for transparency.',
  },
  {
    question: 'How does slot rotation work?',
    answer:
      'Each judge profile has a maximum of 2 rotating advertising slots. Your advertisement rotates with one other attorney every 30 seconds, ensuring both advertisers receive equal visibility and impressions.',
  },
  {
    question: 'What analytics do I get?',
    answer:
      'Your advertiser dashboard includes real-time impressions, clicks, click-through rate (CTR), geographic breakdown, device type analytics, and conversion tracking. Export reports monthly for client presentations.',
  },
  {
    question: 'Can I advertise on multiple judges?',
    answer:
      'Yes! You can purchase ad spots on multiple judges. We offer volume discounts: 10% off for 3+ spots, 15% off for 5+ spots, and 20% off for 10+ spots. Mix and match federal and state judges.',
  },
  {
    question: 'How do I get started?',
    answer:
      'Click "Get Started" to begin our 3-step onboarding process: (1) Enter your firm information, (2) Verify your bar number, (3) Select your billing plan and complete payment. Your ads go live within 24 hours of verification.',
  },
  {
    question: 'What are the payment terms?',
    answer:
      'We offer monthly and annual billing. Annual plans save you 2 months (16.67% discount). All payments are processed securely through Stripe. You can cancel anytime with 30 days notice.',
  },
]

export default function AdvertisePage(): JSX.Element {
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-primary font-medium text-sm mb-6">
              <Award className="h-4 w-4" />
              <span>Bar-Verified Legal Advertising</span>
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Reach Attorneys When They&apos;re Researching Judges
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Promote your legal practice on high-traffic judge profiles. Connect with attorneys
              and litigants at the exact moment they&apos;re preparing for their cases.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard/advertiser/onboarding"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-lg shadow-lg"
              >
                Get Started
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-foreground border-2 border-border rounded-lg hover:bg-muted transition-colors font-semibold text-lg"
              >
                Preview Ad Slots
                <ExternalLink className="ml-2 h-5 w-5" />
              </button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <AdvertisingPreviewModal onClose={() => setShowPreviewModal(false)} />
      )}

      {/* How It Works */}
      <div className="px-4 py-20 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.step} className="relative">
                  <div className="bg-white rounded-xl p-8 shadow-sm border border-border h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">{step.step}</span>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                  {step.step < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ChevronRight className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Choose federal or state judge profiles based on your practice
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Federal Pricing Card */}
            <div className="relative rounded-xl border-2 border-primary bg-white p-8 shadow-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                  PREMIUM
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  Federal Judge Profiles
                </h3>
                <p className="text-muted-foreground">Higher case values, complex litigation</p>
              </div>

              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-foreground">$500</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="text-primary font-medium">
                  or $5,000/year{' '}
                  <span className="text-green-600">(save $1,000)</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {federalFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard/advertiser/onboarding"
                className="block w-full text-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Get Started with Federal
              </Link>
            </div>

            {/* State Pricing Card */}
            <div className="relative rounded-xl border-2 border-green-500 bg-white p-8 shadow-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                  MOST POPULAR
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  State Judge Profiles
                </h3>
                <p className="text-muted-foreground">High search volume, local targeting</p>
              </div>

              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-foreground">$200</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="text-green-600 font-medium">
                  or $2,000/year{' '}
                  <span className="text-green-600">(save $400)</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {stateFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard/advertiser/onboarding"
                className="block w-full text-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Get Started with State
              </Link>
            </div>
          </div>

          {/* Volume Discounts */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Volume Discounts Available
            </h4>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>3+ spots: 10% off</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>5+ spots: 15% off</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>10+ spots: 20% off</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Value Propositions */}
      <div className="px-4 py-20 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Advertise on JudgeFinder?
            </h2>
            <p className="text-xl text-muted-foreground">
              Connect with decision-makers at the perfect moment
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {valueProps.map((prop) => {
              const Icon = prop.icon
              return (
                <div key={prop.title} className="bg-white rounded-xl p-8 shadow-sm border border-border">
                  <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{prop.title}</h3>
                  <p className="text-muted-foreground">{prop.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Slot Availability */}
      <div className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-2">Limited Availability</h3>
                <p className="text-muted-foreground mb-4">
                  Only 2-3 advertising slots available per judge profile. Federal judges typically
                  have higher case values and complexity, while state judges see higher search
                  volume. Spots are filled on a first-come, first-served basis.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="font-medium">Limited</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-medium">Sold Out</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Compliance */}
      <div className="px-4 py-20 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Verified & Compliant
            </h2>
            <p className="text-xl text-muted-foreground">
              All advertisements meet California State Bar standards
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border text-center">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Bar Verified</h3>
              <p className="text-sm text-muted-foreground">
                Every advertiser verified through California State Bar
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border text-center">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Ethical Compliance</h3>
              <p className="text-sm text-muted-foreground">
                Strict adherence to professional conduct rules
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border text-center">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Transparent Labeling</h3>
              <p className="text-sm text-muted-foreground">
                All ads clearly marked with &quot;Ad&quot; badge
              </p>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link
              href="/docs/ads-policy"
              className="inline-flex items-center text-primary hover:underline font-medium"
            >
              Read our full advertising policy
              <ExternalLink className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={idx}
                className="bg-white rounded-lg border border-border p-6 group"
              >
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  <span>{faq.question}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-open:rotate-90 transition-transform" />
                </summary>
                <p className="mt-4 text-muted-foreground leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="px-4 py-20 bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Start Advertising Today
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join 50+ California law firms reaching attorneys when they research judges
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/advertiser/onboarding"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-lg shadow-lg"
            >
              Get Started Now
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/docs/ads-policy"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-foreground border-2 border-border rounded-lg hover:bg-muted transition-colors font-semibold text-lg"
            >
              Read Ad Policy
              <ExternalLink className="ml-2 h-5 w-5" />
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Questions? Email us at{' '}
            <a href="mailto:ads@judgefinder.io" className="text-primary hover:underline">
              ads@judgefinder.io
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
