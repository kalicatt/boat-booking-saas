import { NextResponse } from 'next/server'
import { getMobileUser, isStaff, forbiddenResponse } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'
import { createLog } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * API mobile: Enregistrer un paiement manuel (sans réservation)
 * 
 * POST /api/mobile/payments/record
 * Body: { 
 *   paymentIntentId: string, 
 *   amountCents: number, 
 *   currency?: string,
 *   description?: string 
 * }
 * Headers: Authorization: Bearer <token>
 */
export async function POST(request: Request) {
  const user = await getMobileUser(request)
  if (!isStaff(user)) {
    return forbiddenResponse()
  }
  const userId = user?.userId

  try {
    const body = await request.json()
    const { paymentIntentId, amountCents, currency = 'EUR', description } = body

    if (!paymentIntentId || !amountCents) {
      return NextResponse.json({ error: 'paymentIntentId and amountCents are required' }, { status: 400 })
    }

    // Vérifier si ce paiement existe déjà
    const existing = await prisma.payment.findFirst({
      where: { intentId: paymentIntentId }
    })

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Payment already recorded',
        payment: existing 
      })
    }

    // Créer le record de paiement
    const payment = await prisma.payment.create({
      data: {
        provider: 'stripe_terminal',
        methodType: 'card_present',
        intentId: paymentIntentId,
        amount: amountCents,
        currency: currency.toUpperCase(),
        status: 'succeeded',
        rawPayload: {
          type: 'manual_terminal',
          description: description || 'Paiement manuel Tap to Pay',
          recordedBy: userId,
          recordedAt: new Date().toISOString()
        }
      }
    })

    // Enregistrer dans le ledger pour la compta
    await prisma.ledgerEntry.create({
      data: {
        date: new Date(),
        type: 'CARD',
        amount: amountCents / 100,
        currency: currency.toUpperCase(),
        description: description || 'Paiement Tap to Pay manuel',
        category: 'RECETTE',
        userId: userId || undefined,
        metadata: {
          paymentId: payment.id,
          paymentIntentId,
          source: 'mobile_terminal'
        }
      }
    })

    // Logger l'action
    await createLog(
      'MOBILE_MANUAL_PAYMENT',
      `Manual Tap to Pay: ${amountCents / 100}€, intent: ${paymentIntentId}`,
      userId
    )

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/payments/record] failed', message)
    return NextResponse.json({ error: 'Unable to record payment', details: message }, { status: 500 })
  }
}
