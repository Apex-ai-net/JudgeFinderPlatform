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

const brandIcons: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
  diners: '💳',
  jcb: '💳',
  unionpay: '💳',
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
              <div className="text-2xl">{brandIcons[pm.brand] || '💳'}</div>
              <div>
                <p className="font-medium text-foreground">
                  {pm.brand.toUpperCase()} •••• {pm.last4}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}
                </p>
                {pm.isExpiringSoon && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Expiring soon</span>
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
