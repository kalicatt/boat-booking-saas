import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { logAction } from '@/lib/logger'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

const STAFF_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

/**
 * API mobile: Confirmer un paiement réussi et mettre à jour la réservation
 * 
 * POST /api/mobile/payments/confirm
 * Body: { sessionId: string, paymentIntentId: string }
 */
export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  const role = (session?.user as { role?: string } | undefined)?.role || 'GUEST'
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ 
        error: 'Payment not succeeded', 
        status: paymentIntent.status 
      }, { status: 400 })
    }

    // Mettre à jour la réservation comme payée
    const booking = await prisma.booking.update({
      where: { id: paymentSession.bookingId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'card',
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntent.id
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
    await logAction({
      action: 'MOBILE_PAYMENT_SUCCESS',
      userId: userId || 'system',
      bookingId: booking.id,
      details: {
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentIntentId: paymentIntent.id,
        sessionId: sessionId
      }
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        publicReference: booking.publicReference,
        paymentStatus: booking.paymentStatus,
        paidAt: booking.paidAt
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/payments/confirm] failed', message)
    return NextResponse.json({ error: 'Unable to confirm payment', details: message }, { status: 500 })
  }
}
