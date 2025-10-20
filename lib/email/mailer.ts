import { createServiceRoleClient } from '@/lib/supabase/server'

type SendEmailParams = {
  to: string
  subject: string
  html?: string
  text?: string
  category?: string
}

async function logEmail(params: {
  to: string
  subject: string
  status: 'sent' | 'error'
  metadata?: Record<string, any>
}) {
  try {
    const supabase = await createServiceRoleClient()
    await supabase.from('email_send_log').insert({
      email_to: params.to,
      email_subject: params.subject,
      status: params.status,
      metadata: params.metadata || {},
    })
  } catch (_) {
    // best-effort logging only
  }
}

export async function sendEmail({ to, subject, html, text, category }: SendEmailParams) {
  const apiKey = process.env.SENDGRID_API_KEY
  const from = process.env.SENDGRID_FROM_EMAIL || process.env.BILLING_FROM_EMAIL

  if (!apiKey || !from) {
    // Fallback: no provider configured; log only
    await logEmail({ to, subject, status: 'sent', metadata: { provider: 'none' } })
    return { ok: true, provider: 'none' }
  }

  const payload = {
    personalizations: [
      {
        to: [{ email: to }],
        subject,
      },
    ],
    from: { email: from, name: 'JudgeFinder Billing' },
    content: [
      ...(text ? [{ type: 'text/plain', value: text }] : []),
      ...(html ? [{ type: 'text/html', value: html }] : []),
    ],
    ...(category ? { categories: [category] } : {}),
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      await logEmail({ to, subject, status: 'error', metadata: { provider: 'sendgrid', errText } })
      return { ok: false, provider: 'sendgrid', error: errText }
    }

    await logEmail({ to, subject, status: 'sent', metadata: { provider: 'sendgrid' } })
    return { ok: true, provider: 'sendgrid' }
  } catch (error) {
    await logEmail({ to, subject, status: 'error', metadata: { provider: 'sendgrid', error: String(error) } })
    return { ok: false, provider: 'sendgrid', error }
  }
}

export async function sendReceiptEmail(params: {
  to: string
  amountCents: number
  currency?: string
  orderId?: string
  sessionId?: string
}) {
  const amount = (params.amountCents || 0) / 100
  const subject = 'Receipt for your JudgeFinder purchase'
  const text = `Thank you for your purchase.
Amount: ${amount.toFixed(2)} ${params.currency?.toUpperCase() || 'USD'}
${params.orderId ? `Order ID: ${params.orderId}\n` : ''}${params.sessionId ? `Checkout Session: ${params.sessionId}\n` : ''}
If you have questions, reply to this email.`
  const html = `<p>Thank you for your purchase.</p>
<p><strong>Amount:</strong> $${amount.toFixed(2)} ${params.currency?.toUpperCase() || 'USD'}</p>
${params.orderId ? `<p><strong>Order ID:</strong> ${params.orderId}</p>` : ''}
${params.sessionId ? `<p><strong>Checkout Session:</strong> ${params.sessionId}</p>` : ''}
<p>If you have questions, reply to this email.</p>`
  return await sendEmail({ to: params.to, subject, text, html, category: 'receipt' })
}

export async function sendDunningEmail(params: {
  to: string
  amountCents: number
  invoiceUrl?: string | null
  attemptCount?: number
  nextAttemptAt?: number | null
}) {
  const amount = (params.amountCents || 0) / 100
  const subject = 'Action required: Payment failed on your JudgeFinder subscription'
  const next = params.nextAttemptAt ? new Date(params.nextAttemptAt * 1000).toLocaleString() : 'soon'
  const text = `We were unable to process your latest payment.
Amount due: ${amount.toFixed(2)} USD
${params.invoiceUrl ? `Invoice: ${params.invoiceUrl}\n` : ''}
${params.attemptCount ? `Attempt: ${params.attemptCount}\n` : ''}
Next retry: ${next}
Please update your payment method in the billing portal.`
  const html = `<p>We were unable to process your latest payment.</p>
<p><strong>Amount due:</strong> $${amount.toFixed(2)} USD</p>
${params.invoiceUrl ? `<p><a href="${params.invoiceUrl}">View invoice</a></p>` : ''}
${params.attemptCount ? `<p>Attempt: ${params.attemptCount}</p>` : ''}
<p>Next retry: ${next}</p>
<p>Please update your payment method in the billing portal.</p>`
  return await sendEmail({ to: params.to, subject, text, html, category: 'dunning' })
}

