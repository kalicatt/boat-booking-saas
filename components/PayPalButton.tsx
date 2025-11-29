"use client"
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: {
        createOrder?: () => Promise<string>
        onApprove?: (data: { orderID?: string } | unknown) => void
        onError?: (err: unknown) => void
      }) => { render: (el: HTMLElement) => void }
    }
  }
}

export default function PayPalButton({ amount, onSuccess, onError, messages }:{ amount: number, onSuccess: (orderId: string)=>void, onError: (msg:string)=>void, messages?: { notConfigured?: string, genericError?: string, sdkLoadFailed?: string } }) {
  const containerRef = useRef<HTMLDivElement|null>(null)
  const successRef = useRef(onSuccess)
  const errorRef = useRef(onError)
  const amountRef = useRef(amount)
  const notConfiguredMsg = messages?.notConfigured || 'PayPal not configured'
  const genericErrorMsg = messages?.genericError || 'PayPal error'
  const sdkLoadFailedMsg = messages?.sdkLoadFailed || 'Failed to load PayPal SDK'
  useEffect(()=>{ successRef.current = onSuccess }, [onSuccess])
  useEffect(()=>{ errorRef.current = onError }, [onError])
  useEffect(()=>{ amountRef.current = amount }, [amount])

  useEffect(()=>{
    const container = containerRef.current
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) { errorRef.current(notConfiguredMsg); return }
    if (!container) { errorRef.current('Zone PayPal introuvable'); return }

    const resolveMessage = (err: unknown) => {
      const sanitize = (value: string) => (/zoid destroyed/i.test(value) ? genericErrorMsg : value)
      if (err instanceof Error && err.message) return sanitize(err.message)
      if (typeof err === 'string' && err.trim().length) return sanitize(err.trim())
      return genericErrorMsg
    }

    let cleaned = false
    let buttonsInstance: { close?: () => Promise<void> } | null = null
    let orderBlocked = false

    const handleError = (err: unknown) => {
      if (cleaned) return
      const message = resolveMessage(err)
      orderBlocked = true
      errorRef.current(message)
      if (buttonsInstance?.close) {
        buttonsInstance.close().catch(()=>{})
      }
    }

    const handleSuccess = (orderId: string) => {
      if (cleaned) return
      successRef.current(orderId)
    }

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR&disable-funding=card`
    script.onload = async () => {
      if (!window.paypal) { errorRef.current(sdkLoadFailedMsg); return }
      try {
        const buttons = window.paypal.Buttons({
          createOrder: async () => {
            if (orderBlocked) return ''
            try {
              const response = await fetch('/api/payments/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amountRef.current, currency: 'EUR' })
              })
              const body = await response.json()
              if (!response.ok) {
                const message = body?.error || genericErrorMsg
                handleError(message)
                orderBlocked = true
                return ''
              }
              if (!body?.orderId) {
                const message = 'Commande PayPal absente'
                handleError(message)
                orderBlocked = true
                return ''
              }
              return body.orderId as string
            } catch (err) {
              const message = resolveMessage(err)
              handleError(message)
              orderBlocked = true
              return ''
            }
          },
          onApprove: async (data: { orderID?: string } | unknown) => {
            if (!data || typeof data !== 'object' || typeof (data as { orderID?: string }).orderID !== 'string') {
              handleError('Commande PayPal introuvable')
              return
            }
            handleSuccess((data as { orderID: string }).orderID)
          },
          onError: (err: unknown) => handleError(err)
        })
        buttonsInstance = buttons
        await buttons.render(container)
      } catch (err) {
        handleError(err)
      }
    }
    script.onerror = () => handleError(sdkLoadFailedMsg)
    document.body.appendChild(script)
    return ()=>{
      cleaned = true
      if (buttonsInstance?.close) {
        buttonsInstance.close().catch(()=>{})
      }
      script.remove()
    }
  }, [amount, genericErrorMsg, notConfiguredMsg, sdkLoadFailedMsg])

  return <div ref={containerRef} />
}