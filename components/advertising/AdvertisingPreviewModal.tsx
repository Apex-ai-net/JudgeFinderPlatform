'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Briefcase,
  Phone,
  Mail,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Eye,
  MousePointerClick,
  ChevronRight,
  Shield,
  Award,
  Clock,
  Calculator,
  Check,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface AdvertisingPreviewModalProps {
  onClose: () => void
}

export default function AdvertisingPreviewModal({
  onClose,
}: AdvertisingPreviewModalProps): JSX.Element {
  const modalRef = useFocusTrap<HTMLDivElement>(true, onClose)
  const [activeRotation, setActiveRotation] = useState(0)
  const [selectedCourtLevel, setSelectedCourtLevel] = useState<'federal' | 'state'>('state')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  // Rotation animation every 5 seconds for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRotation((prev) => (prev === 0 ? 1 : 0))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const mockAdvertisers = [
    {
      firm_name: 'Smith & Associates Law Firm',
      description:
        'Experienced federal litigation attorneys specializing in complex commercial disputes and class actions.',
      website: 'www.smithlawfirm.com',
      phone: '(555) 123-4567',
      email: 'contact@smithlawfirm.com',
      specializations: ['Commercial Litigation', 'Class Actions', 'Appellate'],
      bar_number: 'CA-123456',
    },
    {
      firm_name: 'Johnson Legal Group',
      description:
        'Boutique litigation firm focused on employment law, civil rights, and business disputes.',
      website: 'www.johnsonlegal.com',
      phone: '(555) 987-6543',
      email: 'info@johnsonlegal.com',
      specializations: ['Employment Law', 'Civil Rights', 'Business Disputes'],
      bar_number: 'CA-789012',
    },
  ]

  const currentAdvertiser = mockAdvertisers[activeRotation]

  const pricing = {
    federal: { monthly: 500, annual: 5000, savings: 1000 },
    state: { monthly: 200, annual: 2000, savings: 400 },
  }

  const selectedPricing = pricing[selectedCourtLevel]
  const displayPrice = billingCycle === 'monthly' ? selectedPricing.monthly : selectedPricing.annual

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        ref={modalRef}
        className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
      >
        {/* Header */}
        <div className="border-b border-border px-8 py-6 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 id="preview-modal-title" className="text-2xl font-bold text-foreground">
              Advertising Preview
            </h2>
            <p className="text-muted-foreground mt-1">
              See how your ad will appear on judge profiles
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview modal"
            className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Ad Slot Preview */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Live Ad Slot Preview
            </h3>
            <div className="bg-muted/30 rounded-lg p-6">
              <div className="bg-white rounded-lg border-2 border-primary/20 p-6 shadow-sm">
                {/* Ad Badge & Rotation Indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                      Ad
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Rotation {activeRotation + 1} of 2
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1].map((idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          activeRotation === idx ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Mock Advertiser Card */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      {currentAdvertiser.firm_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="h-4 w-4 text-green-600" />
                      <a
                        href={`https://apps.calbar.ca.gov/attorney/Licensee/Detail/${currentAdvertiser.bar_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Verified Attorney (Bar #{currentAdvertiser.bar_number})
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <p className="text-muted-foreground">{currentAdvertiser.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {currentAdvertiser.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{currentAdvertiser.website}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{currentAdvertiser.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{currentAdvertiser.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotation Timer */}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Ads rotate every 30 seconds for equal visibility</span>
              </div>
            </div>
          </div>

          {/* Analytics Preview */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance Analytics Dashboard
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">1,247</div>
                    <div className="text-sm text-muted-foreground">Impressions</div>
                  </div>
                </div>
                <div className="text-xs text-green-600 font-medium">↑ 23% vs last month</div>
              </div>

              <div className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MousePointerClick className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">87</div>
                    <div className="text-sm text-muted-foreground">Clicks</div>
                  </div>
                </div>
                <div className="text-xs text-green-600 font-medium">↑ 15% vs last month</div>
              </div>

              <div className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">7.0%</div>
                    <div className="text-sm text-muted-foreground">Click Rate</div>
                  </div>
                </div>
                <div className="text-xs text-green-600 font-medium">Above average</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Track your ROI in real-time with detailed analytics and reporting
            </p>
          </div>

          {/* Pricing Calculator */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Calculate Your Investment
            </h3>
            <div className="bg-muted/30 rounded-lg p-6">
              {/* Court Level Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Select Court Level
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedCourtLevel('federal')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedCourtLevel === 'federal'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border bg-white'
                    }`}
                  >
                    <div className="font-semibold text-foreground">Federal Judges</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Complex litigation, higher case values
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCourtLevel('state')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedCourtLevel === 'state'
                        ? 'border-green-500 bg-green-50'
                        : 'border-border hover:border-border bg-white'
                    }`}
                  >
                    <div className="font-semibold text-foreground">State Judges</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      High search volume, local targeting
                    </div>
                  </button>
                </div>
              </div>

              {/* Billing Cycle Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Billing Cycle
                </label>
                <div className="bg-white rounded-lg p-1 flex">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                      billingCycle === 'annual'
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Annual
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      Save 2 Months
                    </span>
                  </button>
                </div>
              </div>

              {/* Price Display */}
              <div className="bg-white rounded-lg border-2 border-primary p-6">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <div className="text-3xl font-bold text-foreground">${displayPrice}</div>
                    <div className="text-muted-foreground">
                      per {billingCycle === 'monthly' ? 'month' : 'year'}
                    </div>
                  </div>
                  {billingCycle === 'annual' && (
                    <div className="text-right">
                      <div className="text-green-600 font-semibold">
                        Save ${selectedPricing.savings}
                      </div>
                      <div className="text-sm text-muted-foreground">2 months free</div>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Rotation slot on {selectedCourtLevel} judge profiles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Real-time analytics dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Bar verification badge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Priority support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Policy Points */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Advertising Standards
            </h3>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Bar Verification Required</div>
                    <div className="text-sm text-muted-foreground">
                      All advertisers verified through California State Bar
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Transparent Labeling</div>
                    <div className="text-sm text-muted-foreground">
                      All ads clearly marked with &quot;Ad&quot; badge and bar verification link
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">Ethical Compliance</div>
                    <div className="text-sm text-muted-foreground">
                      Strict adherence to California Rules of Professional Conduct
                    </div>
                  </div>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  href="/docs/ads-policy"
                  className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
                >
                  Read full advertising policy
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border rounded-lg hover:bg-muted font-medium text-foreground transition-colors"
            >
              Close Preview
            </button>
            <Link
              href="/advertise"
              className="flex-1 px-6 py-3 bg-muted text-foreground border border-border rounded-lg hover:bg-muted/80 font-medium text-center transition-colors"
            >
              View Full Pricing
            </Link>
            <Link
              href="/dashboard/advertiser/onboarding"
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <span>Get Started with Advertising</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
