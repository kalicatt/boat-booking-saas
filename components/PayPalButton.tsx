"use client"
import { useEffect, useRef } from 'react'

export default function PayPalButton({ amount, onSuccess, onError, messages }:{ amount: number, onSuccess: (orderId: string)=>void, onError: (msg:string)=>void, messages?: { notConfigured?: string, genericError?: string, sdkLoadFailed?: string } }) {
  const containerRef = useRef<HTMLDivElement|null>(null)
  useEffect(()=>{
    const script = document.createElement('script')
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) { onError(messages?.notConfigured || 'PayPal not configured'); return }
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR&disable-funding=card`
    script.onload = async () => {
      // @ts-ignore
      if (!window.paypal || !containerRef.current) return
      // @ts-ignore
      window.paypal.Buttons({
        createOrder: async () => {
          const res = await fetch('/api/payments/paypal/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: 'EUR' }) })
          const data = await res.json()
          if (!res.ok) { onError(data.error || messages?.genericError || 'PayPal error'); return '' }
          return data.orderId
        },
        onApprove: async (data: any) => {
          // Defer capture to server after booking creation; return orderId
          if (!data?.orderID) { onError('Commande PayPal introuvable'); return }
          onSuccess(data.orderID)
        },
        onError: (err: any) => onError(String(err))
      }).render(containerRef.current)
    }
    script.onerror = () => onError(messages?.sdkLoadFailed || 'Failed to load PayPal SDK')
    document.body.appendChild(script)
    return ()=>{ script.remove() }
  }, [amount, onSuccess, onError])

  return <div ref={containerRef} />
}