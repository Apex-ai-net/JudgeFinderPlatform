'use client'

import { CreditCard, AlertTriangle, Check } from 'lucide-react'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
  isExpiringSoon: boolean
}

interface PaymentMethodsWidgetProps {
  paymentMethods: PaymentMethod[]
}

/**
 * Card Brand Icon Component
 * Returns SVG icon for each card brand
 */
function CardBrandIcon({ brand }: { brand: string }) {
  const brandLower = brand.toLowerCase()

  // Visa
  if (brandLower === 'visa') {
    return (
      <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
        <span className="text-white font-bold text-xs">VISA</span>
      </div>
    )
  }

  // Mastercard
  if (brandLower === 'mastercard') {
    return (
      <div className="w-12 h-8 rounded flex items-center justify-center relative">
        <div className="absolute left-1 w-5 h-5 bg-red-500 rounded-full opacity-80"></div>
        <div className="absolute right-1 w-5 h-5 bg-orange-400 rounded-full opacity-80"></div>
      </div>
    )
  }

  // American Express
  if (brandLower === 'amex') {
    return (
      <div className="w-12 h-8 bg-blue-400 rounded flex items-center justify-center">
        <span className="text-white font-bold text-xs">AMEX</span>
      </div>
    )
  }

  // Discover
  if (brandLower === 'discover') {
    return (
      <div className="w-12 h-8 bg-orange-500 rounded flex items-center justify-center">
        <span className="text-white font-bold text-[10px]">DISC</span>
      </div>
    )
  }

  // Default card icon
  return (
    <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
      <CreditCard className="h-4 w-4 text-gray-500 dark:text-gray-400" />
    </div>
  )
}

export default function PaymentMethodsWidget({ paymentMethods }: PaymentMethodsWidgetProps) {
  if (paymentMethods.length === 0) {
    return null
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Methods
        </h3>
        <span className="text-sm text-muted-foreground">{paymentMethods.length} on file</span>
      </div>

      <div className="space-y-3">
        {paymentMethods.map((pm) => (
          <div
            key={pm.id}
            className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CardBrandIcon brand={pm.brand} />
              <div>
                <p className="font-medium text-foreground">
                  {pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} •••• {pm.last4}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}
                </p>
                {pm.isExpiringSoon && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-orange-600 dark:text-orange-400 font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      Expiring in {pm.expMonth}/{pm.expYear}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pm.isDefault && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Default
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Add, remove, or update payment methods in the billing portal.
        </p>
      </div>
    </div>
  )
}
