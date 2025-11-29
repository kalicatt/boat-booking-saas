import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { bookingId } = body || {}
    if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const stripeSecret = process.env.STRIPE_SECRET_KEY
    if (!stripeSecret) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const stripe = new Stripe(stripeSecret)

    // Amount in cents from booking.totalPrice
    const amountCents = Math.round((booking.totalPrice || 0) * 100)
    if (amountCents <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: { bookingId }
    })

    await prisma.payment.create({
      data: {
        provider: 'stripe',
        bookingId,
        intentId: intent.id,
        amount: amountCents,
        currency: 'EUR',
        status: intent.status,
      }
    })

    return NextResponse.json({ clientSecret: intent.client_secret })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message || 'Server error' }, { status: 500 })
  }
}