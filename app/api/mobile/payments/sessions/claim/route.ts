import { NextResponse } from 'next/server'
import { getMobileUser, isStaff, forbiddenResponse } from '@/lib/mobileAuth'
import { claimNextSession } from '@/lib/payments/paymentSessions'

export const runtime = 'nodejs'

/**
 * API mobile: Claim la prochaine session de paiement en attente
 * Polling par l'app Android toutes les 5-10 secondes
 * 
 * GET /api/mobile/payments/sessions/claim?deviceId=xxx
 * Headers: Authorization: Bearer <token>
 * 
 * Returns:
 * - 200 + session si une session est disponible
 * - 204 si aucune session en attente
 * - 403 si pas autorisé
 */
export async function GET(request: Request) {
  const user = await getMobileUser(request)
  if (!isStaff(user)) {
    return forbiddenResponse()
  }

  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId query param required' }, { status: 400 })
    }

    // Claim la prochaine session disponible
    const claimedSession = await claimNextSession(deviceId)

    if (!claimedSession) {
      // Aucune session en attente
      return new NextResponse(null, { status: 204 })
    }

    // Retourner la session avec les détails de la réservation
    return NextResponse.json({
      session: {
        id: claimedSession.id,
        bookingId: claimedSession.bookingId,
        amount: claimedSession.amount,
        currency: claimedSession.currency,
        metadata: claimedSession.metadata,
        expiresAt: claimedSession.expiresAt.toISOString()
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/payments/sessions/claim] failed', message)
    return NextResponse.json({ error: 'Unable to claim session', details: message }, { status: 500 })
  }
}
