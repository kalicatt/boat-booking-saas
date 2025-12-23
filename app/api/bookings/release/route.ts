import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { cacheInvalidateDate } from '@/lib/cache'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { notifyPlanningUpdate } from '@/lib/planningNotify'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = await rateLimit({ key: `booking:release:${ip}`, limit: 30, windowMs: 60_000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes', retryAfter: rl.retryAfter }, { status: 429 })
    }

    const payload = await request.json().catch(() => ({}))
    const bookingId = typeof payload?.bookingId === 'string' ? payload.bookingId : null
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId requis' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true }
    })

    if (!booking || booking.status !== 'PENDING' || booking.isPaid) {
      return NextResponse.json({ success: true })
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY
    const stripe = stripeSecret ? new Stripe(stripeSecret) : null

    for (const payment of booking.payments) {
      if (payment.provider === 'stripe' && payment.intentId && stripe && payment.status !== 'succeeded') {
        try {
          await stripe.paymentIntents.cancel(payment.intentId)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`Impossible d'annuler l'intent ${payment.intentId}:`, message)
        }
      }
      if (payment.status !== 'cancelled') {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'cancelled' } })
      }
    }

    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } })

    if (booking.date) {
      const bookingDate = booking.date.toISOString().slice(0, 10)
      await cacheInvalidateDate(bookingDate)
    }

    // Notifier le planning de la mise à jour
    await notifyPlanningUpdate()

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Erreur release booking:', message)
    return NextResponse.json({ error: 'Erreur technique' }, { status: 500 })
  }
}
