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
    if (!stripeSecret) {
      return NextResponse.json(
        {
          error: 'Stripe not configured',
          code: 'STRIPE_NOT_CONFIGURED',
          ...(process.env.NODE_ENV === 'production'
            ? {}
            : {
                hint:
                  'Set STRIPE_SECRET_KEY (sk_test_... / sk_live_...) in your environment and restart the dev server.'
              })
        },
        { status: 500 }
      )
    }

    if (stripeSecret.startsWith('pk_')) {
      return NextResponse.json(
        {
          error: 'Stripe secret key looks like a publishable key (pk_...).',
          code: 'STRIPE_SECRET_INVALID',
          ...(process.env.NODE_ENV === 'production'
            ? {}
            : { hint: 'Use STRIPE_SECRET_KEY=sk_test_... (server-side key), not a pk_ key.' })
        },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeSecret)

    // Amount in cents from booking.totalPrice
    const amountCents = Math.round((booking.totalPrice || 0) * 100)
    if (amountCents <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      payment_method_types: ['card'],
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('[create-intent] Error:', e)
    }
    return NextResponse.json(
      {
        error: message || 'Server error',
        ...(process.env.NODE_ENV === 'production'
          ? {}
          : { hint: 'Check STRIPE_SECRET_KEY and your database Payment schema.' })
      },
      { status: 500 }
    )
  }
}