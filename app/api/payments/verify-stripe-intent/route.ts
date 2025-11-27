import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { intentId } = body || {}
    if (!intentId) return NextResponse.json({ error: 'Missing intentId' }, { status: 400 })

    const stripeSecret = process.env.STRIPE_SECRET_KEY
    if (!stripeSecret) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const stripe = new Stripe(stripeSecret)
    const intent = await stripe.paymentIntents.retrieve(intentId)
    return NextResponse.json({ status: intent.status, amount: intent.amount, currency: intent.currency })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
