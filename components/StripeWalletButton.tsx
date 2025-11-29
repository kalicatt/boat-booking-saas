"use client"
import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'
import { Elements, PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js'

type Props = {
  amount: number // in minor units (cents)
  currency: string // 'eur'
  country?: string // 'FR'
  label?: string // Displayed in wallet sheet
  ensurePendingBooking: () => Promise<string> // returns bookingId (pending)
  onSuccess: (intentId: string) => void
  onError?: (message: string) => void
}

function InnerPRB({ amount, currency, country = 'FR', label = 'Sweet Narcisse', ensurePendingBooking, onSuccess, onError }: Props) {
  const stripe = useStripe()
    const [paymentRequest, setPaymentRequest] = useState<ReturnType<Stripe['paymentRequest']> | null>(null)

  useEffect(() => {
    let mounted = true
    const setup = async () => {
      if (!stripe) return
      const pr = stripe.paymentRequest({
        country,
        currency,
        total: { label, amount },
        requestPayerName: true,
        requestPayerEmail: true,
      })
      const result = await pr.canMakePayment()
      if (mounted && result) {
        setPaymentRequest(pr)
        pr.on('paymentmethod', async (ev) => {
          try {
            const bookingId = await ensurePendingBooking()
            if (!bookingId) {
              ev.complete('fail')
              onError?.('Réservation introuvable')
              return
            }
            const res = await fetch('/api/payments/create-intent', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bookingId })
            })
            const data = await res.json()
            if (!res.ok || !data.clientSecret) {
              ev.complete('fail')
              onError?.(data?.error || 'Erreur paiement')
              return
            }
            // First confirmation using the wallet-provided payment method
            const confirm1 = await stripe.confirmCardPayment(
              data.clientSecret,
              { payment_method: ev.paymentMethod.id },
              { handleActions: true }
            )
            if (confirm1.error) {
              ev.complete('fail')
              onError?.(confirm1.error.message || 'Erreur de confirmation')
              return
            }
            let intent = confirm1.paymentIntent
            if (intent && (intent.status === 'requires_action' || intent.status === 'requires_confirmation')) {
              const confirm2 = await stripe.confirmCardPayment(data.clientSecret)
              if (confirm2.error) {
                ev.complete('fail')
                onError?.(confirm2.error.message || 'Action de paiement requise non réalisée')
                return
              }
              intent = confirm2.paymentIntent
            }
            if (!intent || !intent.id) {
              ev.complete('fail')
              onError?.('Confirmation de paiement incomplète')
              return
            }
            // Verify server-side before success
            try {
              const verifyRes = await fetch('/api/payments/verify-stripe-intent', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intentId: intent.id })
              })
              const verify = await verifyRes.json()
              if (!verifyRes.ok || verify.status !== 'succeeded') {
                ev.complete('fail')
                onError?.(`Paiement Stripe non confirmé. Statut: ${String(verify?.status || 'inconnu')}`)
                return
              }
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e)
              ev.complete('fail')
              onError?.(`Impossible de vérifier le paiement Stripe: ${msg || 'erreur inconnue'}`)
              return
            }

            ev.complete('success')
            onSuccess(intent.id)
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            ev.complete('fail')
            onError?.(msg || 'Erreur réseau pendant le paiement')
          }
        })
      }
    }
    setup()
    return () => { mounted = false }
  }, [stripe, amount, currency, country, label, ensurePendingBooking, onSuccess, onError])

  if (!paymentRequest) return null
  return (
    <div className="mt-3">
      <PaymentRequestButtonElement options={{
        paymentRequest,
        style: { paymentRequestButton: { theme: 'dark', height: '44px' } }
      }} />
    </div>
  )
}

export default function StripeWalletButton(props: Props) {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(() => (pk ? loadStripe(pk) : null))
  useEffect(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (pk) setStripePromise(loadStripe(pk))
  }, [])
  if (!stripePromise) return null
  return (
    <Elements stripe={stripePromise}>
      <InnerPRB {...props} />
    </Elements>
  )
}
