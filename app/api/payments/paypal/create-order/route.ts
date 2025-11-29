import { NextResponse } from 'next/server'
import { getPaypalApiBase } from '@/lib/paypal'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { amount: rawAmount, currency = 'EUR' } = body || {}
    const amount = typeof rawAmount === 'string' ? Number.parseFloat(rawAmount) : Number(rawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    const hasClientId = Boolean(clientId)
    const hasClientSecret = Boolean(clientSecret)
    console.log('PayPal env check', {
      hasClientId,
      hasClientSecret,
      mode: process.env.PAYPAL_MODE,
      publicIdSet: Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID)
    })
    if (!hasClientId || !hasClientSecret) {
      console.error('PayPal configuration missing')
      return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 })
    }

    const base = getPaypalApiBase()
    const authRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST', headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      }, body: 'grant_type=client_credentials'
    })
    const auth = await authRes.json()
    if (!authRes.ok || !auth.access_token) {
      console.error('PayPal auth failed', authRes.status, auth)
      return NextResponse.json({ error: 'PayPal auth failed', details: auth?.error_description || auth?.message || null }, { status: 500 })
    }

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST', headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.access_token}`
      }, body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }]
      })
    })
    const order = await orderRes.json()
    if (!orderRes.ok || !order.id) {
      console.error('PayPal order creation failed', orderRes.status, order)
      return NextResponse.json({ error: 'Order creation failed', details: order?.message || order?.debug_id || null }, { status: 500 })
    }
    return NextResponse.json({ orderId: order.id })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message || 'Server error' }, { status: 500 })
  }
}