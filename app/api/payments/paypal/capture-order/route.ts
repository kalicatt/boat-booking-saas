import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, bookingId } = body || {}
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    if (!clientId || !clientSecret) return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 })

    const authRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST', headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      }, body: 'grant_type=client_credentials'
    })
    const auth = await authRes.json()
    if (!auth.access_token) return NextResponse.json({ error: 'PayPal auth failed' }, { status: 500 })

    // Try to capture; if already captured, we'll fetch order details
    let capture: any
    let amountVal = 0
    let currency = 'EUR'
    try {
      const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST', headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.access_token}`
        }
      })
      capture = await captureRes.json()
      if (capture.status !== 'COMPLETED') throw new Error('Capture not completed')
      amountVal = Number(capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0)
      currency = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code || 'EUR'
    } catch (e) {
      // Fallback: get order details and proceed if already completed
      const orderRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${auth.access_token}` }
      })
      const order = await orderRes.json()
      if (order.status !== 'COMPLETED') {
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}