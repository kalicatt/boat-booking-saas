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

    const amountEur = amountCents / 100

    // Enregistrer dans le PaymentLedger pour la compta
    const ledgerEntry = await prisma.paymentLedger.create({
      data: {
        eventType: 'SALE',
        provider: 'card',
        methodType: 'tap_to_pay',
        amount: amountCents,
        currency: currency.toUpperCase(),
        actorId: userId || undefined,
        occurredAt: new Date(),
        note: `${description || 'Paiement Tap to Pay manuel'} - Intent: ${paymentIntentId}`
      }
    })

    // Logger l'action
    await createLog(
      'MOBILE_MANUAL_PAYMENT',
      `Manual Tap to Pay: ${amountEur}€, intent: ${paymentIntentId}`,
      userId
    )

    return NextResponse.json({
      success: true,
      ledgerEntry: {
        id: ledgerEntry.id,
        amount: amountEur,
        currency: ledgerEntry.currency
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/payments/record] failed', message)
    return NextResponse.json({ error: 'Unable to record payment', details: message }, { status: 500 })
  }
}
