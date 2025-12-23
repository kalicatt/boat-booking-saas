import { NextResponse } from 'next/server'
import { getMobileUser, isStaff, forbiddenResponse } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export const runtime = 'nodejs'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-11-17.clover'
  })
}

/**
 * API mobile: Créer un PaymentIntent Stripe pour Tap to Pay
 * 
 * POST /api/mobile/payments/create-intent
 * Body: { sessionId: string, bookingId: string, amountCents: number }
 * Headers: Authorization: Bearer <token>
 */
export async function POST(request: Request) {
  const user = await getMobileUser(request)
  if (!isStaff(user)) {
    return forbiddenResponse()
  }

  try {
    const body = await request.json()
    const { sessionId, bookingId, amountCents } = body

    if (!sessionId || !bookingId || !amountCents) {
      return NextResponse.json({ error: 'sessionId, bookingId and amountCents are required' }, { status: 400 })
    }

    // Vérifier la session existe et est en CLAIMED ou PROCESSING
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id: sessionId }
    })

    if (!paymentSession) {
      return NextResponse.json({ error: 'Payment session not found' }, { status: 404 })
    }

    if (!['CLAIMED', 'PROCESSING'].includes(paymentSession.status)) {
      return NextResponse.json({ error: 'Payment session not in valid state' }, { status: 400 })
    }

    // Récupérer la réservation
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, boat: true }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Créer PaymentIntent Stripe
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata: {
        bookingId: booking.id,
        bookingReference: booking.publicReference,
        sessionId: sessionId,
        customerName: `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim(),
        boat: booking.boat?.name || '',
        slot: booking.startTime.toISOString()
      }
    })

    // Mettre à jour la session avec l'intentId
    await prisma.paymentSession.update({
      where: { id: sessionId },
      data: {
        intentId: paymentIntent.id,
        intentClientSecret: paymentIntent.client_secret,
        status: 'PROCESSING',
        processingAt: new Date()
      }
    })

    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/payments/create-intent] failed', message)
    return NextResponse.json({ error: 'Unable to create payment intent', details: message }, { status: 500 })
  }
}
