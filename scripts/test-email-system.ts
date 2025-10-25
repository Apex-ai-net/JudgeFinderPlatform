#!/usr/bin/env tsx
/**
 * Email System Manual Testing Script
 *
 * Usage:
 *   npx tsx scripts/test-email-system.ts [email-type] [organization-id]
 *
 * Examples:
 *   npx tsx scripts/test-email-system.ts payment-success org_test123
 *   npx tsx scripts/test-email-system.ts payment-failed org_test123
 *   npx tsx scripts/test-email-system.ts dunning-reminder org_test123
 *   npx tsx scripts/test-email-system.ts dunning-urgent org_test123
 *   npx tsx scripts/test-email-system.ts dunning-final org_test123
 *   npx tsx scripts/test-email-system.ts subscription-cancelled org_test123
 *   npx tsx scripts/test-email-system.ts usage-report org_test123
 *   npx tsx scripts/test-email-system.ts all org_test123
 */

import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendDunningEmail,
  sendSubscriptionCancelledEmail,
  sendUsageReportEmail,
} from '../lib/email/service'

type EmailType =
  | 'payment-success'
  | 'payment-failed'
  | 'dunning-reminder'
  | 'dunning-urgent'
  | 'dunning-final'
  | 'subscription-cancelled'
  | 'usage-report'
  | 'all'

async function testPaymentSuccess(orgId: string) {
  console.log('🧪 Testing Payment Success Email...')
  await sendPaymentSuccessEmail(orgId, {
    amount: 500.0,
    currency: 'usd',
    invoiceUrl: 'https://invoice.stripe.com/test_invoice_12345',
    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    paymentMethod: 'Visa ending in 4242',
  })
  console.log('✅ Payment Success Email sent!')
}

async function testPaymentFailed(orgId: string) {
  console.log('🧪 Testing Payment Failed Email...')
  await sendPaymentFailedEmail(orgId, {
    amount: 500.0,
    currency: 'usd',
    attemptCount: 1,
    nextAttempt: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    invoiceUrl: 'https://invoice.stripe.com/test_invoice_12345',
    billingPortalUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
  })
  console.log('✅ Payment Failed Email sent!')
}

async function testDunningReminder(orgId: string) {
  console.log('🧪 Testing Dunning Reminder Email...')
  await sendDunningEmail(orgId, {
    amount: 500.0,
    currency: 'usd',
    daysOverdue: 1,
    severity: 'reminder',
    invoiceUrl: 'https://invoice.stripe.com/test_invoice_12345',
    billingPortalUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
  })
  console.log('✅ Dunning Reminder Email sent!')
}

async function testDunningUrgent(orgId: string) {
  console.log('🧪 Testing Dunning Urgent Email...')
  await sendDunningEmail(orgId, {
    amount: 500.0,
    currency: 'usd',
    daysOverdue: 5,
    severity: 'urgent',
    invoiceUrl: 'https://invoice.stripe.com/test_invoice_12345',
    billingPortalUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
  })
  console.log('✅ Dunning Urgent Email sent!')
}

async function testDunningFinal(orgId: string) {
  console.log('🧪 Testing Dunning Final Email...')
  await sendDunningEmail(orgId, {
    amount: 500.0,
    currency: 'usd',
    daysOverdue: 8,
    severity: 'final',
    invoiceUrl: 'https://invoice.stripe.com/test_invoice_12345',
    billingPortalUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
  })
  console.log('✅ Dunning Final Email sent!')
}

async function testSubscriptionCancelled(orgId: string) {
  console.log('🧪 Testing Subscription Cancelled Email...')
  await sendSubscriptionCancelledEmail(orgId, {
    tier: 'PRO',
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    reactivationUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
  })
  console.log('✅ Subscription Cancelled Email sent!')
}

async function testUsageReport(orgId: string) {
  console.log('🧪 Testing Usage Report Email...')
  await sendUsageReportEmail(orgId, {
    periodStart: 'January 1, 2025',
    periodEnd: 'January 31, 2025',
    seats: 10,
    usedSeats: 8,
    apiCallsUsed: 750,
    apiCallsLimit: 1000,
    totalCost: 490.0,
    currency: 'usd',
  })
  console.log('✅ Usage Report Email sent!')
}

async function testAll(orgId: string) {
  console.log('🧪 Testing ALL Email Types...\n')

  await testPaymentSuccess(orgId)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  await testPaymentFailed(orgId)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  await testDunningReminder(orgId)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  await testDunningUrgent(orgId)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  await testDunningFinal(orgId)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  await testSubscriptionCancelled(orgId)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  await testUsageReport(orgId)

  console.log('\n✅ All emails sent!')
}

async function main() {
  const args = process.argv.slice(2)
  const emailType = args[0] as EmailType
  const orgId = args[1]

  if (!emailType || !orgId) {
    console.error('❌ Usage: npx tsx scripts/test-email-system.ts [email-type] [organization-id]')
    console.error('\nEmail types:')
    console.error('  - payment-success')
    console.error('  - payment-failed')
    console.error('  - dunning-reminder')
    console.error('  - dunning-urgent')
    console.error('  - dunning-final')
    console.error('  - subscription-cancelled')
    console.error('  - usage-report')
    console.error('  - all')
    console.error('\nExample:')
    console.error('  npx tsx scripts/test-email-system.ts payment-success org_test123')
    process.exit(1)
  }

  console.log(`\n📧 Email System Test\n`)
  console.log(`Organization ID: ${orgId}`)
  console.log(`Email Type: ${emailType}\n`)

  // Check environment variables
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️  Warning: SENDGRID_API_KEY not set. Emails will be logged but not sent.\n')
  }

  try {
    switch (emailType) {
      case 'payment-success':
        await testPaymentSuccess(orgId)
        break
      case 'payment-failed':
        await testPaymentFailed(orgId)
        break
      case 'dunning-reminder':
        await testDunningReminder(orgId)
        break
      case 'dunning-urgent':
        await testDunningUrgent(orgId)
        break
      case 'dunning-final':
        await testDunningFinal(orgId)
        break
      case 'subscription-cancelled':
        await testSubscriptionCancelled(orgId)
        break
      case 'usage-report':
        await testUsageReport(orgId)
        break
      case 'all':
        await testAll(orgId)
        break
      default:
        console.error(`❌ Unknown email type: ${emailType}`)
        process.exit(1)
    }

    console.log('\n📊 Check email_send_log table in Supabase for delivery status.')
    console.log('📬 Check your inbox (billing email for organization) for the email.\n')
  } catch (error) {
    console.error('\n❌ Error sending email:', error)
    process.exit(1)
  }
}

main()
