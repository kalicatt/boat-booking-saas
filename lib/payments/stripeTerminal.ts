import Stripe from 'stripe'

let cachedStripe: Stripe | null = null

const STRIPE_API_VERSION = '2024-06-20' as Stripe.LatestApiVersion

const getStripeSecretKey = (): string => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }
  return key
}

export const getStripeClient = (): Stripe => {
  if (cachedStripe) {
    return cachedStripe
  }
  cachedStripe = new Stripe(getStripeSecretKey(), { apiVersion: STRIPE_API_VERSION })
  return cachedStripe
}

export const getTerminalLocation = (): string | undefined => {
  return process.env.STRIPE_TERMINAL_LOCATION_ID || process.env.STRIPE_TERMINAL_LOCATION || undefined
}

export async function createConnectionToken(): Promise<string> {
  const stripe = getStripeClient()
  const params: Stripe.Terminal.ConnectionTokenCreateParams = {}
  const locationId = getTerminalLocation()
  if (locationId) {
    params.location = locationId
  }
  const token = await stripe.terminal.connectionTokens.create(params)
  if (!token.secret) {
    throw new Error('Stripe did not return a connection token secret')
  }
  return token.secret
}

export type PaymentIntentInput = {
  amount: number
  currency?: string
  description?: string
  metadata?: Stripe.MetadataParam
  captureMethod?: Stripe.PaymentIntentCreateParams.CaptureMethod
}

export async function createTapToPayIntent(params: PaymentIntentInput): Promise<Stripe.PaymentIntent> {
  if (!Number.isInteger(params.amount) || params.amount <= 0) {
    throw new Error('Payment intent amount must be a positive integer (cents)')
  }
  const stripe = getStripeClient()
  return stripe.paymentIntents.create({
    amount: params.amount,
    currency: (params.currency || 'eur').toLowerCase(),
    capture_method: params.captureMethod || 'automatic',
    payment_method_types: ['card_present'],
    description: params.description,
    metadata: params.metadata
  })
}

export async function cancelTapToPayIntent(intentId: string): Promise<Stripe.PaymentIntent> {
  if (!intentId) {
    throw new Error('Unable to cancel payment intent without an id')
  }
  const stripe = getStripeClient()
  return stripe.paymentIntents.cancel(intentId)
}
