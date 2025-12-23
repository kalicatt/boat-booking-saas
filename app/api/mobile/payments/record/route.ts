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

    // Vérifier si ce paiement existe déjà dans le ledger
    const existing = await prisma.ledgerEntry.findFirst({
      where: { 
        metadata: {
          path: ['paymentIntentId'],
          equals: paymentIntentId
        }
      }
    })

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Payment already recorded',
        ledgerEntry: existing 
      })
    }

    // Enregistrer dans le ledger pour la compta (paiement manuel sans réservation)
    const ledgerEntry = await prisma.ledgerEntry.create({
      data: {
        date: new Date(),
        type: 'CARD',
        amount: amountCents / 100,
        currency: currency.toUpperCase(),
        description: description || 'Paiement Tap to Pay manuel',
        category: 'RECETTE',
        userId: userId || undefined,
        metadata: {
          paymentIntentId,
          source: 'mobile_terminal',
          type: 'manual_tap_to_pay',
          recordedAt: new Date().toISOString()
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
      ledgerEntry: {
        id: ledgerEntry.id,
        amount: ledgerEntry.amount,
        currency: ledgerEntry.currency,
        description: ledgerEntry.description
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/payments/record] failed', message)
    return NextResponse.json({ error: 'Unable to record payment', details: message }, { status: 500 })
  }
}
