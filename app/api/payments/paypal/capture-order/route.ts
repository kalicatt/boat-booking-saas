import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPaypalApiBase } from '@/lib/paypal'

type PaypalAmount = { value?: string; currency_code?: string }
type PaypalCapture = {
  status?: string
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ amount?: PaypalAmount }>
    }
  }>
}

const isPaypalCapture = (input: unknown): input is PaypalCapture => {
  return Boolean(input && typeof input === 'object' && 'status' in input)
}

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, bookingId } = body || {}
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    if (!clientId || !clientSecret) return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 })

    const base = getPaypalApiBase()
    const authRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST', headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      }, body: 'grant_type=client_credentials'
    })
    const auth = await authRes.json()
    if (!authRes.ok || !auth.access_token) {
      console.error('PayPal auth failed (capture)', authRes.status, auth)
      return NextResponse.json({ error: 'PayPal auth failed', details: auth?.error_description || auth?.message || null }, { status: 500 })
    }

    // Try to capture; if already captured, we'll fetch order details
    let capture: PaypalCapture | undefined
    let amountVal = 0
    let currency = 'EUR'
    try {
      const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST', headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.access_token}`
        }
      })
      const captureJson: unknown = await captureRes.json()
      if (isPaypalCapture(captureJson)) capture = captureJson
      if (!captureRes.ok || capture?.status !== 'COMPLETED') {
        console.error('PayPal capture step failed', captureRes.status, capture)
        throw new Error('Capture not completed')
      }
      amountVal = Number(capture?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0)
      currency = capture?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code || 'EUR'
    } catch {
      // Fallback: get order details and proceed if already completed
      const orderRes = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${auth.access_token}` }
      })
      const order = await orderRes.json()
      if (order.status !== 'COMPLETED') {
        console.error('PayPal capture fallback failed', orderRes.status, order)
        return NextResponse.json({ error: 'Capture failed' }, { status: 400 })
      }
      amountVal = Number(order.purchase_units?.[0]?.amount?.value || 0)
      currency = order.purchase_units?.[0]?.amount?.currency_code || 'EUR'
    }

    if (bookingId) {
      // Create payment row and mark booking paid
      await prisma.payment.create({ data: {
        provider: 'paypal',
        booking: { connect: { id: bookingId } },
        orderId,
        amount: Math.round(amountVal * 100),
        currency,
        status: 'succeeded',
      }})
      await prisma.booking.update({ where: { id: bookingId }, data: { isPaid: true, status: 'CONFIRMED' } })
    }

    return NextResponse.json({ success: true, orderId, bookingId: bookingId || null })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message || 'Server error' }, { status: 500 })
  }
}