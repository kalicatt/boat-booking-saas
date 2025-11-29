const PAYPAL_LIVE_API = 'https://api-m.paypal.com'
const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com'

export type PaypalMode = 'live' | 'sandbox'

export function getPaypalMode(): PaypalMode {
  const raw = (process.env.PAYPAL_MODE || 'live').toLowerCase()
  return raw === 'sandbox' ? 'sandbox' : 'live'
}

export function getPaypalApiBase(): string {
  return getPaypalMode() === 'sandbox' ? PAYPAL_SANDBOX_API : PAYPAL_LIVE_API
}
