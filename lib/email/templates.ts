/**
 * Email Templates for Stripe Events
 *
 * Provides HTML and text templates for all payment-related emails:
 * - Payment success confirmations
 * - Payment failure notifications
 * - Dunning sequence (progressive urgency)
 * - Subscription cancellation
 * - Usage reports
 */

export interface PaymentSuccessData {
  organizationName: string
  amount: number
  currency: string
  invoiceUrl?: string | null
  periodEnd: string
  paymentMethod?: string
}

export interface PaymentFailedData {
  organizationName: string
  amount: number
  currency: string
  invoiceUrl?: string | null
  attemptCount: number
  nextAttempt?: string
  billingPortalUrl?: string
}

export interface DunningData {
  organizationName: string
  amount: number
  currency: string
  daysOverdue: number
  invoiceUrl?: string | null
  billingPortalUrl?: string
  severity: 'reminder' | 'urgent' | 'final'
}

export interface SubscriptionCancelledData {
  organizationName: string
  tier: string
  endDate: string
  reactivationUrl?: string
}

export interface UsageReportData {
  organizationName: string
  periodStart: string
  periodEnd: string
  seats: number
  usedSeats: number
  apiCallsUsed: number
  apiCallsLimit: number
  totalCost: number
  currency: string
}

/**
 * Payment Success Email Template
 */
export function getPaymentSuccessTemplate(data: PaymentSuccessData): {
  subject: string
  html: string
  text: string
} {
  const subject = 'Payment Received - JudgeFinder Subscription'

  const text = `Hello ${data.organizationName},

Thank you for your payment! We've successfully processed your subscription payment.

Payment Details:
- Amount: $${data.amount.toFixed(2)} ${data.currency.toUpperCase()}
- Payment Method: ${data.paymentMethod || 'Default payment method'}
- Next Billing Date: ${data.periodEnd}

${data.invoiceUrl ? `View Invoice: ${data.invoiceUrl}\n` : ''}
Your subscription is now active and all features are available.

Questions? Reply to this email or contact our support team.

Best regards,
The JudgeFinder Team`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .success-icon { font-size: 48px; margin-bottom: 10px; }
    .details { background: #f9fafb; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1 style="margin: 0;">Payment Received</h1>
    </div>
    <div class="content">
      <p>Hello ${data.organizationName},</p>

      <p>Thank you for your payment! We've successfully processed your subscription payment.</p>

      <div class="details">
        <h3 style="margin-top: 0;">Payment Details</h3>
        <p style="margin: 5px 0;"><strong>Amount:</strong> $${data.amount.toFixed(2)} ${data.currency.toUpperCase()}</p>
        <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${data.paymentMethod || 'Default payment method'}</p>
        <p style="margin: 5px 0;"><strong>Next Billing Date:</strong> ${data.periodEnd}</p>
      </div>

      ${data.invoiceUrl ? `<a href="${data.invoiceUrl}" class="button">View Invoice</a>` : ''}

      <p>Your subscription is now active and all features are available.</p>

      <p>Questions? Reply to this email or contact our support team.</p>

      <p>Best regards,<br>The JudgeFinder Team</p>
    </div>
    <div class="footer">
      <p>JudgeFinder - Judicial Analytics Platform</p>
      <p>This is an automated receipt. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`

  return { subject, html, text }
}

/**
 * Payment Failed Email Template
 */
export function getPaymentFailedTemplate(data: PaymentFailedData): {
  subject: string
  html: string
  text: string
} {
  const subject = 'Action Required: Payment Failed - JudgeFinder'

  const text = `Hello ${data.organizationName},

We were unable to process your latest payment.

Payment Details:
- Amount Due: $${data.amount.toFixed(2)} ${data.currency.toUpperCase()}
- Attempt: ${data.attemptCount}
${data.nextAttempt ? `- Next Retry: ${data.nextAttempt}\n` : ''}

${data.invoiceUrl ? `View Invoice: ${data.invoiceUrl}\n` : ''}
Please update your payment method to avoid service interruption.

${data.billingPortalUrl ? `Update Payment Method: ${data.billingPortalUrl}\n` : ''}
If you have questions, please contact our support team.

Best regards,
The JudgeFinder Team`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .alert-icon { font-size: 48px; margin-bottom: 10px; }
    .details { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="alert-icon">⚠</div>
      <h1 style="margin: 0;">Payment Failed</h1>
    </div>
    <div class="content">
      <p>Hello ${data.organizationName},</p>

      <p><strong>We were unable to process your latest payment.</strong></p>

      <div class="details">
        <h3 style="margin-top: 0;">Payment Details</h3>
        <p style="margin: 5px 0;"><strong>Amount Due:</strong> $${data.amount.toFixed(2)} ${data.currency.toUpperCase()}</p>
        <p style="margin: 5px 0;"><strong>Attempt:</strong> ${data.attemptCount}</p>
        ${data.nextAttempt ? `<p style="margin: 5px 0;"><strong>Next Retry:</strong> ${data.nextAttempt}</p>` : ''}
      </div>

      ${data.invoiceUrl ? `<p><a href="${data.invoiceUrl}">View Invoice</a></p>` : ''}

      <p>Please update your payment method to avoid service interruption.</p>

      ${data.billingPortalUrl ? `<a href="${data.billingPortalUrl}" class="button">Update Payment Method</a>` : ''}

      <p>If you have questions, please contact our support team.</p>

      <p>Best regards,<br>The JudgeFinder Team</p>
    </div>
    <div class="footer">
      <p>JudgeFinder - Judicial Analytics Platform</p>
    </div>
  </div>
</body>
</html>`

  return { subject, html, text }
}

/**
 * Dunning Sequence Email Template (Progressive Urgency)
 */
export function getDunningTemplate(data: DunningData): {
  subject: string
  html: string
  text: string
} {
  const severityConfig = {
    reminder: {
      subject: 'Reminder: Payment Overdue - JudgeFinder',
      tone: 'We noticed your payment is overdue. This is a friendly reminder to update your payment method.',
      color: '#f59e0b',
      icon: '🔔',
    },
    urgent: {
      subject: 'Urgent: Payment Required - JudgeFinder',
      tone: 'Your payment is significantly overdue. Please update your payment method immediately to avoid service interruption.',
      color: '#ea580c',
      icon: '⚠️',
    },
    final: {
      subject: 'Final Notice: Subscription Will Be Cancelled - JudgeFinder',
      tone: 'This is your final notice. Your subscription will be cancelled if payment is not received soon.',
      color: '#dc2626',
      icon: '🚨',
    },
  }

  const config = severityConfig[data.severity]

  const text = `Hello ${data.organizationName},

${config.tone}

Payment Details:
- Amount Due: $${data.amount.toFixed(2)} ${data.currency.toUpperCase()}
- Days Overdue: ${data.daysOverdue}

${data.invoiceUrl ? `View Invoice: ${data.invoiceUrl}\n` : ''}
${data.billingPortalUrl ? `Update Payment Method: ${data.billingPortalUrl}\n` : ''}

We value your business and are here to help if you have any questions.

Best regards,
The JudgeFinder Team`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Overdue</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${config.color}; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .alert-icon { font-size: 48px; margin-bottom: 10px; }
    .details { background: #fef2f2; border-left: 4px solid ${config.color}; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: ${config.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="alert-icon">${config.icon}</div>
      <h1 style="margin: 0;">Payment Overdue</h1>
    </div>
    <div class="content">
      <p>Hello ${data.organizationName},</p>

      <p><strong>${config.tone}</strong></p>

      <div class="details">
        <h3 style="margin-top: 0;">Payment Details</h3>
        <p style="margin: 5px 0;"><strong>Amount Due:</strong> $${data.amount.toFixed(2)} ${data.currency.toUpperCase()}</p>
        <p style="margin: 5px 0;"><strong>Days Overdue:</strong> ${data.daysOverdue}</p>
      </div>

      ${data.invoiceUrl ? `<p><a href="${data.invoiceUrl}">View Invoice</a></p>` : ''}

      ${data.billingPortalUrl ? `<a href="${data.billingPortalUrl}" class="button">Update Payment Method</a>` : ''}

      <p>We value your business and are here to help if you have any questions.</p>

      <p>Best regards,<br>The JudgeFinder Team</p>
    </div>
    <div class="footer">
      <p>JudgeFinder - Judicial Analytics Platform</p>
    </div>
  </div>
</body>
</html>`

  return { subject: config.subject, html, text }
}

/**
 * Subscription Cancelled Email Template
 */
export function getSubscriptionCancelledTemplate(data: SubscriptionCancelledData): {
  subject: string
  html: string
  text: string
} {
  const subject = 'Subscription Cancelled - JudgeFinder'

  const text = `Hello ${data.organizationName},

Your JudgeFinder subscription has been cancelled.

Cancellation Details:
- Plan: ${data.tier}
- Access Until: ${data.endDate}

Your data will remain accessible until ${data.endDate}. After this date, you'll be downgraded to the free tier with limited features.

${data.reactivationUrl ? `Want to reactivate? ${data.reactivationUrl}\n` : ''}

We're sorry to see you go! If you have feedback about your experience, we'd love to hear from you.

Best regards,
The JudgeFinder Team`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Cancelled</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6b7280; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .icon { font-size: 48px; margin-bottom: 10px; }
    .details { background: #f9fafb; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">👋</div>
      <h1 style="margin: 0;">Subscription Cancelled</h1>
    </div>
    <div class="content">
      <p>Hello ${data.organizationName},</p>

      <p>Your JudgeFinder subscription has been cancelled.</p>

      <div class="details">
        <h3 style="margin-top: 0;">Cancellation Details</h3>
        <p style="margin: 5px 0;"><strong>Plan:</strong> ${data.tier}</p>
        <p style="margin: 5px 0;"><strong>Access Until:</strong> ${data.endDate}</p>
      </div>

      <p>Your data will remain accessible until <strong>${data.endDate}</strong>. After this date, you'll be downgraded to the free tier with limited features.</p>

      ${data.reactivationUrl ? `<a href="${data.reactivationUrl}" class="button">Reactivate Subscription</a>` : ''}

      <p>We're sorry to see you go! If you have feedback about your experience, we'd love to hear from you.</p>

      <p>Best regards,<br>The JudgeFinder Team</p>
    </div>
    <div class="footer">
      <p>JudgeFinder - Judicial Analytics Platform</p>
    </div>
  </div>
</body>
</html>`

  return { subject, html, text }
}

/**
 * Monthly Usage Report Email Template
 */
export function getUsageReportTemplate(data: UsageReportData): {
  subject: string
  html: string
  text: string
} {
  const seatUtilization = data.seats > 0 ? ((data.usedSeats / data.seats) * 100).toFixed(1) : '0.0'
  const apiUtilization =
    data.apiCallsLimit > 0 ? ((data.apiCallsUsed / data.apiCallsLimit) * 100).toFixed(1) : '0.0'

  const subject = `Monthly Usage Report - ${data.periodStart} to ${data.periodEnd}`

  const text = `Hello ${data.organizationName},

Here's your monthly usage report for JudgeFinder.

Reporting Period: ${data.periodStart} to ${data.periodEnd}

Seat Usage:
- Seats Used: ${data.usedSeats} of ${data.seats} (${seatUtilization}%)

API Usage:
- API Calls: ${data.apiCallsUsed.toLocaleString()} of ${data.apiCallsLimit.toLocaleString()} (${apiUtilization}%)

Total Cost: $${data.totalCost.toFixed(2)} ${data.currency.toUpperCase()}

Need more capacity? Contact us to upgrade your plan.

Best regards,
The JudgeFinder Team`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Usage Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .icon { font-size: 48px; margin-bottom: 10px; }
    .metric { background: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 6px; }
    .progress-bar { background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .progress-fill { background: #667eea; height: 100%; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">📊</div>
      <h1 style="margin: 0;">Monthly Usage Report</h1>
    </div>
    <div class="content">
      <p>Hello ${data.organizationName},</p>

      <p>Here's your monthly usage report for JudgeFinder.</p>

      <p><strong>Reporting Period:</strong> ${data.periodStart} to ${data.periodEnd}</p>

      <div class="metric">
        <h3 style="margin-top: 0;">Seat Usage</h3>
        <p style="margin: 5px 0;"><strong>${data.usedSeats}</strong> of <strong>${data.seats}</strong> seats used</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${seatUtilization}%"></div>
        </div>
        <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">${seatUtilization}% utilization</p>
      </div>

      <div class="metric">
        <h3 style="margin-top: 0;">API Usage</h3>
        <p style="margin: 5px 0;"><strong>${data.apiCallsUsed.toLocaleString()}</strong> of <strong>${data.apiCallsLimit.toLocaleString()}</strong> API calls</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${apiUtilization}%"></div>
        </div>
        <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">${apiUtilization}% utilization</p>
      </div>

      <div class="metric">
        <h3 style="margin-top: 0;">Total Cost</h3>
        <p style="margin: 5px 0; font-size: 24px; color: #667eea;"><strong>$${data.totalCost.toFixed(2)}</strong> ${data.currency.toUpperCase()}</p>
      </div>

      <p>Need more capacity? Contact us to upgrade your plan.</p>

      <p>Best regards,<br>The JudgeFinder Team</p>
    </div>
    <div class="footer">
      <p>JudgeFinder - Judicial Analytics Platform</p>
    </div>
  </div>
</body>
</html>`

  return { subject, html, text }
}
