import { NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'
import { attachIntentToSession, claimNextSession, failSession } from '@/lib/payments/paymentSessions'
import { createTapToPayIntent, getTerminalLocation } from '@/lib/payments/stripeTerminal'

export const runtime = 'nodejs'

const DEVICE_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

export async function GET(request: Request) {
  console.log('[session/next] GET called')
  const user = await getMobileUser(request)
  const role = user?.role || 'GUEST'
  console.log('[session/next] user:', user?.email, 'role:', role)
  if (!user || !DEVICE_ROLES.includes(role)) {
    console.log('[session/next] Forbidden - user not authorized')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const deviceId = url.searchParams.get('deviceId')
  console.log('[session/next] deviceId:', deviceId)
  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
  }

  try {
    console.log('[session/next] calling claimNextSession...')
    const claimed = await claimNextSession(deviceId)
    console.log('[session/next] claimed result:', claimed ? claimed.id : 'null')
    if (!claimed) {
      console.log('[session/next] no session found, returning 204')
      return new Response(null, { status: 204 })
    }

    if (!claimed.bookingId) {
      await failSession(claimed.id, 'Missing bookingId for session')
      return NextResponse.json({ error: 'Invalid payment session' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: claimed.bookingId },
      select: {
        id: true,
        publicReference: true,
        startTime: true,
        endTime: true,
        user: { select: { firstName: true, lastName: true } }
      }
    })

    try {
      const metadata = {
        bookingId: claimed.bookingId,
        paymentSessionId: claimed.id,
        bookingReference: booking?.publicReference ?? null
      }

      const paymentIntent = await createTapToPayIntent({
        amount: claimed.amount,
        currency: claimed.currency,
        description: booking?.publicReference || 'Reservation Sweet Narcisse',
        metadata
      })

      if (!paymentIntent.client_secret) {
        throw new Error('Stripe did not return a client secret')
      }

      await attachIntentToSession({ sessionId: claimed.id, intentId: paymentIntent.id, clientSecret: paymentIntent.client_secret })

      await prisma.payment.create({
        data: {
          provider: 'stripe_terminal',
          methodType: claimed.methodType || 'card_present',
          bookingId: claimed.bookingId,
          intentId: paymentIntent.id,
          amount: claimed.amount,
          currency: claimed.currency,
          status: 'requires_action',
          rawPayload: metadata,
          paymentSessionId: claimed.id
        }
      })

      return NextResponse.json({
        session: {
          ...claimed,
          booking,
          intentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret
        },
        locationId: getTerminalLocation() || null
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create Stripe intent'
      await failSession(claimed.id, message)
      console.error('[terminal/session/next] stripe', message)
      return NextResponse.json({ error: 'Stripe intent error', details: message }, { status: 502 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[terminal/session/next]', message)
    return NextResponse.json({ error: 'Unable to claim session', details: message }, { status: 500 })
  }
}
