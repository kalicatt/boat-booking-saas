import { NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'
import { completeSessionSuccess, getSession } from '@/lib/payments/paymentSessions'
import { getStripeClient } from '@/lib/payments/stripeTerminal'

export const runtime = 'nodejs'

const STAFF_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

type ConfirmPayload = {
  paymentIntentId?: string
}

/**
 * POST /api/payments/terminal/session/[id]/confirm
 * 
 * Confirme qu'un paiement Terminal a réussi côté mobile
 * Vérifie le PaymentIntent Stripe et met à jour la session et la réservation
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  const role = user?.role || 'GUEST'
  if (!user || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing session id' }, { status: 400 })
  }

  let payload: ConfirmPayload
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const paymentIntentId = payload.paymentIntentId
  if (!paymentIntentId) {
    return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 })
  }

  try {
    const sessionRecord = await getSession(id)
    if (!sessionRecord) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Vérifier le PaymentIntent côté Stripe
    const stripe = getStripeClient()
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (intent.status !== 'succeeded') {
      return NextResponse.json({ 
        error: 'Payment not succeeded', 
        stripeStatus: intent.status 
      }, { status: 400 })
    }

    // Mettre à jour la session comme réussie
    await completeSessionSuccess(id)
    
    // Mettre à jour le Payment record
    await prisma.payment.updateMany({
      where: { paymentSessionId: id },
      data: {
        status: 'succeeded',
        intentId: paymentIntentId,
        rawPayload: {
          confirmedAt: new Date().toISOString(),
          stripeStatus: intent.status,
          amount: intent.amount,
          currency: intent.currency
        }
      }
    })

    // Marquer la réservation comme payée
    if (sessionRecord.bookingId) {
      await prisma.booking.update({ 
        where: { id: sessionRecord.bookingId }, 
        data: { 
          isPaid: true
        } 
      })
    }

    return NextResponse.json({ 
      status: 'CONFIRMED',
      session: {
        id: sessionRecord.id,
        bookingId: sessionRecord.bookingId,
        amount: sessionRecord.amount,
        currency: sessionRecord.currency
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[terminal/session/confirm] failed', message)
    return NextResponse.json({ error: 'Unable to confirm payment', details: message }, { status: 500 })
  }
}
