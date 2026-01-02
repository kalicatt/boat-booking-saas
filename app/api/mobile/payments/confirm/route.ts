import { NextResponse } from 'next/server'
import { getMobileUser, isStaff, forbiddenResponse } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { createLog } from '@/lib/logger'

export const runtime = 'nodejs'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-11-17.clover'
  })
}

/**
 * API mobile: Confirmer un paiement réussi et mettre à jour la réservation
 * 
 * POST /api/mobile/payments/confirm
 * Body: { sessionId: string, paymentIntentId: string }
 * Headers: Authorization: Bearer <token>
 */
export async function POST(request: Request) {
  const user = await getMobileUser(request)
  if (!isStaff(user)) {
    return forbiddenResponse()
  }

  try {
    const body = await request.json()
    const { sessionId, paymentIntentId } = body

    if (!sessionId || !paymentIntentId) {
      return NextResponse.json({ error: 'sessionId and paymentIntentId are required' }, { status: 400 })
    }

    // Récupérer la session de paiement
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id: sessionId }
    })

    if (!paymentSession) {
      return NextResponse.json({ error: 'Payment session not found' }, { status: 404 })
    }

    // Vérifier le PaymentIntent avec Stripe
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ 
        error: 'Payment not succeeded', 
        status: paymentIntent.status 
      }, { status: 400 })
    }

    // Mettre à jour la réservation comme payée
    const booking = await prisma.booking.update({
      where: { id: paymentSession.bookingId || undefined },
      data: {
        isPaid: true,
        status: 'CONFIRMED'
      }
    })

    // Mettre à jour la session comme réussie
    await prisma.paymentSession.update({
      where: { id: sessionId },
      data: {
        status: 'SUCCEEDED',
        completedAt: new Date()
      }
    })

    // Logger l'action
    await createLog(
      'MOBILE_PAYMENT_SUCCESS',
      `Booking ${booking.publicReference}, ${paymentIntent.amount / 100}€, intent: ${paymentIntent.id}, session: ${sessionId}`
    )

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        publicReference: booking.publicReference,
        status: booking.status,
        isPaid: booking.isPaid
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/payments/confirm] failed', message)
    return NextResponse.json({ error: 'Unable to confirm payment', details: message }, { status: 500 })
  }
}
