import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@/auth'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try {
    const body = await req.json()
    const { amountCents, bookingId, successUrl, cancelUrl, currency = 'EUR' } = body || {}
    if(!amountCents || !bookingId || !successUrl || !cancelUrl){
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if(!stripeKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency, product_data: { name: `Réservation ${bookingId}` }, unit_amount: amountCents }, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { bookingId }
    })
    return NextResponse.json({ id: session.id, url: session.url })
  } catch (e:any){
    return NextResponse.json({ error: 'Stripe session error', details: String(e?.message||e) }, { status: 500 })
  }
}
