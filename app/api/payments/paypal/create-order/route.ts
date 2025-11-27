import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { amount, currency = 'EUR' } = body || {}
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

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

    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST', headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.access_token}`
      }, body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }]
      })
    })
    const order = await orderRes.json()
    if (!order.id) return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
    return NextResponse.json({ orderId: order.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}