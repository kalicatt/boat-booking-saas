import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { PAYMENT_TIMEOUT_MINUTES } from '../lib/config'

const prisma = new PrismaClient()

async function main() {
  const ttlEnv = process.env.PENDING_BOOKING_TTL_MIN
  const ttlParsed = ttlEnv ? Number(ttlEnv) : NaN
  const ttlMin = Number.isFinite(ttlParsed) && ttlParsed > 0 ? ttlParsed : PAYMENT_TIMEOUT_MINUTES
  const cutoff = new Date(Date.now() - ttlMin * 60 * 1000)

  console.log(`🧹 Cleanup pending bookings older than ${ttlMin} minutes (before ${cutoff.toISOString()})`)

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const stripe = stripeKey ? new Stripe(stripeKey) : null

  const stale = await prisma.booking.findMany({
    where: { status: 'PENDING', isPaid: false, createdAt: { lt: cutoff } },
    select: { id: true }
  })

  console.log(`Found ${stale.length} stale pending booking(s)`)

  let cancelledBookings = 0
  let cancelledIntents = 0

  for (const b of stale) {
    // Cancel associated Stripe intents if any (not succeeded)
    const stripePayments = await prisma.payment.findMany({
      where: { bookingId: b.id, provider: 'stripe', status: { not: 'succeeded' }, intentId: { not: null } },
      select: { id: true, intentId: true }
    })

    for (const p of stripePayments) {
      try {
          if (stripe && p.intentId) {
          await stripe.paymentIntents.cancel(p.intentId)
          cancelledIntents++
        }
        await prisma.payment.update({ where: { id: p.id }, data: { status: 'cancelled' } })
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        console.warn(`Failed to cancel intent ${p.intentId} for booking ${b.id}:`, msg)
      }
    }

    // Mark booking cancelled
    await prisma.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED' } })
    cancelledBookings++
  }

  console.log(`✅ Cleanup done: ${cancelledBookings} booking(s) cancelled, ${cancelledIntents} Stripe intent(s) cancelled`)
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
