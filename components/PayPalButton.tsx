"use client"

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { useCallback, useEffect, useMemo, useRef } from 'react'

type PayPalCopy = {
  notConfigured?: string
  genericError?: string
  sdkLoadFailed?: string
}

interface PayPalButtonProps {
  amount: number
  onSuccess: (orderId: string) => void
  onError: (message: string) => void
  messages?: PayPalCopy
}

export default function PayPalButton({ amount, onSuccess, onError, messages }: PayPalButtonProps) {
  const notConfiguredMsg = messages?.notConfigured || 'PayPal not configured'
  const genericErrorMsg = messages?.genericError || 'PayPal error'
  const sdkLoadFailedMsg = messages?.sdkLoadFailed || 'Failed to load PayPal SDK'
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const missingClientId = !clientId

  const resolveMessage = useCallback((err: unknown) => {
    const normalize = (value: string) => (/zoid destroyed/i.test(value) ? genericErrorMsg : value)
    if (err instanceof Error && err.message) return normalize(err.message)
    if (typeof err === 'string' && err.trim().length) return normalize(err.trim())
    return genericErrorMsg
  }, [genericErrorMsg])

  const paypalOptions = useMemo(() => {
    if (!clientId) return null
    return {
      'client-id': clientId,
      currency: 'EUR',
      intent: 'capture',
      components: 'buttons',
      'disable-funding': 'card'
    } as const
  }, [clientId])

  const forceRerenderDeps = useMemo(() => [amount, genericErrorMsg], [amount, genericErrorMsg])
  const amountRef = useRef(amount)
  amountRef.current = amount

  const handleCreateOrder = useCallback(async () => {
    try {
      const response = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountRef.current, currency: 'EUR' })
      })
      const body = await response.json()
      if (!response.ok || !body?.orderId) {
        const message = resolveMessage(body?.error || genericErrorMsg)
        throw new Error(message)
      }
      return body.orderId as string
    } catch (err) {
      const message = resolveMessage(err)
      onError(message)
      throw err instanceof Error ? err : new Error(message)
    }
  }, [genericErrorMsg, onError, resolveMessage])

  const handleApprove = useCallback(async (data: Record<string, unknown>) => {
    const orderId = typeof data?.orderID === 'string' ? data.orderID : null
    if (!orderId) {
      onError(genericErrorMsg)
      return
    }
    onSuccess(orderId)
  }, [genericErrorMsg, onError, onSuccess])

  const handleError = useCallback((err: unknown) => {
    onError(resolveMessage(err) || sdkLoadFailedMsg)
  }, [onError, resolveMessage, sdkLoadFailedMsg])

  useEffect(() => {
    if (missingClientId) {
      onError(notConfiguredMsg)
    }
  }, [missingClientId, notConfiguredMsg, onError])

  if (!clientId || !paypalOptions) {
    return null
  }

  return (
    <PayPalScriptProvider options={paypalOptions} deferLoading={false}>
      <PayPalButtons
        style={{ layout: 'vertical', shape: 'rect', color: 'white', label: 'pay' }}
        fundingSource="paypal"
        forceReRender={forceRerenderDeps}
        createOrder={handleCreateOrder}
        onApprove={handleApprove}
        onError={handleError}
      />
    </PayPalScriptProvider>
  )
}