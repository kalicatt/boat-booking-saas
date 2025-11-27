"use client"
import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

function InnerPayment({ onSuccess }: { onSuccess: (intentId: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const handleSubmit = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(null)
    const { error: err, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (err) {
      setError(err.message || 'Payment error')
    } else if (paymentIntent && paymentIntent.id) {
      onSuccess(paymentIntent.id)
    } else {
      setError('Payment confirmation incomplete')
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-3">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <div className="text-red-600 text-xs">{error}</div>}
      <button type="button" onClick={handleSubmit} disabled={submitting} className="px-3 py-2 rounded bg-[#0f172a] text-[#eab308] text-sm font-bold">
        {submitting ? 'Traitement...' : 'Payer et confirmer'}
      </button>
    </div>
  )
}

export default function PaymentElementWrapper({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: (intentId: string) => void }) {
  const [stripePromise, setStripePromise] = useState<any>(null)
  useEffect(()=>{
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (pk) setStripePromise(loadStripe(pk))
  }, [])
  if (!stripePromise) return <div className="text-xs text-slate-500">Stripe non configuré</div>
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerPayment onSuccess={onSuccess} />
    </Elements>
  )
}