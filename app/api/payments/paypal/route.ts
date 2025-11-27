import { NextResponse } from 'next/server'

function getBase(){
  const mode = (process.env.PAYPAL_MODE || 'live').toLowerCase()
  return mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
}

async function getAccessToken(){
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if(!id || !secret) throw new Error('PayPal not configured')
  const auth = Buffer.from(`${id}:${secret}`).toString('base64')
  const res = await fetch(`${getBase()}/v1/oauth2/token`, { method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' })
  const json = await res.json()
  return json.access_token
}

export async function POST(req: Request){
  const body = await req.json()
  const { amount, currency = 'EUR', bookingId, intent = 'CAPTURE' } = body || {}
  if(!amount || !bookingId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  try {
    const token = await getAccessToken()
    const orderRes = await fetch(`${getBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, purchase_units: [{ amount: { currency_code: currency, value: amount }, reference_id: bookingId }] })
    })
    const order = await orderRes.json()
    return NextResponse.json(order)
  } catch (e:any){
    return NextResponse.json({ error: 'PayPal create error', details: String(e?.message||e) }, { status: 500 })
  }
}

export async function PUT(req: Request){
  const body = await req.json()
  const { orderId } = body || {}
  if(!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  try {
    const token = await getAccessToken()
    const capRes = await fetch(`${getBase()}/v2/checkout/orders/${orderId}/capture`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    const cap = await capRes.json()
    return NextResponse.json(cap)
  } catch (e:any){
    return NextResponse.json({ error: 'PayPal capture error', details: String(e?.message||e) }, { status: 500 })
  }
}
