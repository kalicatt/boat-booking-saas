"use client"
import { useState, useEffect, useRef, memo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

// Cache global pour l'instance Stripe - évite de recharger js.stripe.com à chaque montage
let stripePromiseCache: Promise<Stripe | null> | null = null
let stripeInstanceCache: Stripe | null = null

function getStripeInstance(pk: string): Promise<Stripe | null> {
  if (stripeInstanceCache) {
    return Promise.resolve(stripeInstanceCache)
  }
  if (!stripePromiseCache) {
    stripePromiseCache = loadStripe(pk).then((stripe) => {
      stripeInstanceCache = stripe
      return stripe
    })
  }
  return stripePromiseCache
}

const InnerPayment = memo(function InnerPayment({ onSuccess }: { onSuccess: (intentId: string) => void }) {
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
})

export default function PaymentElementWrapper({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: (intentId: string) => void }) {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_KEY
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    
    if (!pk) {
      setLoadError('Clé Stripe non configurée')
      setLoading(false)
      return
    }

    // Utiliser le cache global au lieu de recharger Stripe
    getStripeInstance(pk)
      .then((stripe) => {
        if (mountedRef.current) {
          setStripeInstance(stripe)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          console.error('[PaymentElementWrapper] Stripe load error:', err)
          setLoadError('Impossible de charger le module de paiement. Vérifiez que les extensions de navigateur ne bloquent pas js.stripe.com')
          setLoading(false)
        }
      })

    return () => { mountedRef.current = false }
  }, [pk])

  if (loading) {
    return (
      <div className="text-xs text-slate-500 animate-pulse">
        Chargement du module de paiement...
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
        <p className="text-red-700 dark:text-red-400 font-medium">⚠️ Erreur de chargement Stripe</p>
        <p className="text-red-600 dark:text-red-300 text-xs mt-1">{loadError}</p>
        <p className="text-red-500 dark:text-red-400 text-xs mt-2">
          Essayez en mode navigation privée ou désactivez les bloqueurs de publicités.
        </p>
      </div>
    )
  }

  if (!stripeInstance) {
    return <div className="text-xs text-slate-500">Stripe non disponible</div>
  }

  return (
    <Elements stripe={stripeInstance} options={{ clientSecret }}>
      <InnerPayment onSuccess={onSuccess} />
    </Elements>
  )
}