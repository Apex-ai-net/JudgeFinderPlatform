/**
 * Test helpers and fixtures for Stripe integration tests
 */

import type Stripe from 'stripe'

/**
 * Create a mock Stripe checkout session
 */
export function createMockCheckoutSession(
  overrides?: Partial<Stripe.Checkout.Session>
): Stripe.Checkout.Session {
  return {
    id: 'cs_test_123',
    object: 'checkout.session',
    after_expiration: null,
    allow_promotion_codes: true,
    amount_subtotal: 50000,
    amount_total: 50000,
    automatic_tax: {
      enabled: false,
      liability: null,
      status: null,
    },
    billing_address_collection: 'required',
    cancel_url: 'https://example.com/cancel',
    client_reference_id: null,
    client_secret: null,
    consent: null,
    consent_collection: null,
    created: 1234567890,
    currency: 'usd',
    currency_conversion: null,
    custom_fields: [],
    custom_text: {
      after_submit: null,
      shipping_address: null,
      submit: null,
      terms_of_service_acceptance: null,
    },
    customer: 'cus_test_123',
    customer_creation: null,
    customer_details: {
      address: {
        city: 'San Francisco',
        country: 'US',
        line1: '123 Main St',
        line2: null,
        postal_code: '94111',
        state: 'CA',
      },
      email: 'test@example.com',
      name: 'Test User',
      phone: null,
      tax_exempt: 'none',
      tax_ids: [],
    },
    customer_email: 'test@example.com',
    expires_at: 1234567890 + 86400,
    invoice: null,
    invoice_creation: null,
    livemode: false,
    locale: null,
    metadata: {
      organization_name: 'Test Organization',
      ad_type: 'judge-profile',
      notes: 'Test notes',
      client_ip: '127.0.0.1',
      created_at: '2024-01-01T00:00:00.000Z',
    },
    mode: 'payment',
    payment_intent: 'pi_test_123',
    payment_link: null,
    payment_method_collection: 'if_required',
    payment_method_configuration_details: null,
    payment_method_options: null,
    payment_method_types: ['card'],
    payment_status: 'paid',
    phone_number_collection: {
      enabled: false,
    },
    recovered_from: null,
    redirect_on_completion: 'always',
    return_url: null,
    setup_intent: null,
    shipping_address_collection: null,
    shipping_cost: null,
    shipping_details: null,
    shipping_options: [],
    status: 'complete',
    submit_type: null,
    subscription: null,
    success_url: 'https://example.com/success',
    total_details: {
      amount_discount: 0,
      amount_shipping: 0,
      amount_tax: 0,
    },
    ui_mode: 'hosted',
    url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    ...overrides,
  } as Stripe.Checkout.Session
}

/**
 * Create a mock Stripe webhook event
 */
export function createMockWebhookEvent(
  type: string,
  data: unknown,
  overrides?: Partial<Stripe.Event>
): Stripe.Event {
  return {
    id: 'evt_test_123',
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: 1234567890,
    data: {
      object: data,
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: 'req_test_123',
      idempotency_key: null,
    },
    type,
    ...overrides,
  } as Stripe.Event
}

/**
 * Create a mock checkout.session.completed event
 */
export function createCheckoutSessionCompletedEvent(
  sessionOverrides?: Partial<Stripe.Checkout.Session>
): Stripe.Event {
  const session = createMockCheckoutSession(sessionOverrides)
  return createMockWebhookEvent('checkout.session.completed', session)
}

/**
 * Create a mock checkout.session.expired event
 */
export function createCheckoutSessionExpiredEvent(
  sessionOverrides?: Partial<Stripe.Checkout.Session>
): Stripe.Event {
  const session = createMockCheckoutSession({
    status: 'expired',
    payment_status: 'unpaid',
    ...sessionOverrides,
  })
  return createMockWebhookEvent('checkout.session.expired', session)
}

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(options: {
  method: string
  body?: unknown
  headers?: Record<string, string>
  ip?: string
}): Request {
  const url = 'https://example.com/api/test'
  const headers = new Headers(options.headers || {})

  // Add default headers
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const init: RequestInit = {
    method: options.method,
    headers,
  }

  if (options.body) {
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  }

  const request = new Request(url, init)

  // Add IP for rate limiting tests
  if (options.ip) {
    Object.defineProperty(request, 'ip', {
      value: options.ip,
      writable: false,
    })
  }

  return request
}

/**
 * Mock Stripe error
 */
export class MockStripeError extends Error {
  type: string
  code?: string
  statusCode?: number

  constructor(message: string, type: string, code?: string, statusCode?: number) {
    super(message)
    this.name = 'StripeError'
    this.type = type
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * Create a Stripe API error
 */
export function createStripeApiError(message = 'API error', code = 'api_error'): MockStripeError {
  return new MockStripeError(message, 'StripeAPIError', code, 500)
}

/**
 * Create a Stripe invalid request error
 */
export function createStripeInvalidRequestError(
  message = 'Invalid request',
  param?: string
): MockStripeError {
  const error = new MockStripeError(message, 'StripeInvalidRequestError', 'invalid_request', 400)
  if (param) {
    Object.defineProperty(error, 'param', { value: param })
  }
  return error
}

/**
 * Create a Stripe signature verification error
 */
export function createStripeSignatureVerificationError(): MockStripeError {
  return new MockStripeError(
    'No signatures found matching the expected signature for payload',
    'StripeSignatureVerificationError',
    'signature_verification_failed',
    400
  )
}
