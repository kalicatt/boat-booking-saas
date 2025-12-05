import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmationEmail } from '@/lib/bookingConfirmationEmail'

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      await prisma.payment.updateMany({ where: { intentId: pi.id }, data: { status: 'succeeded' } })
      if (bookingId) {
        await prisma.booking.update({ where: { id: bookingId }, data: { isPaid: true, status: 'CONFIRMED' } })
        await sendBookingConfirmationEmail(bookingId)
      }
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await prisma.payment.updateMany({ where: { intentId: pi.id }, data: { status: 'failed' } })
      break
    }
    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge
      await prisma.payment.updateMany({ where: { intentId: ch.payment_intent as string }, data: { status: 'refunded' } })
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}