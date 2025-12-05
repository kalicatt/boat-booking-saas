import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmationEmail } from '@/lib/bookingConfirmationEmail'

interface ConfirmBody {
  bookingId?: string
  provider?: 'stripe' | 'paypal'
  intentId?: string | null
}

export async function POST(request: Request) {
  try {
    const body: ConfirmBody | null = await request.json().catch(() => null)
    const bookingId = body?.bookingId?.trim()
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
    }

    const provider = body?.provider ?? 'stripe'
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, confirmationEmailSentAt: true }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (provider !== 'stripe') {
      return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 })
    }

    const intentId = body?.intentId?.trim()
    if (!intentId) {
      return NextResponse.json({ error: 'Missing Stripe intentId' }, { status: 400 })
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY
    if (!stripeSecret) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const stripe = new Stripe(stripeSecret)
    const intent = await stripe.paymentIntents.retrieve(intentId)
    if (intent.metadata?.bookingId && intent.metadata.bookingId !== bookingId) {
      return NextResponse.json({ error: 'Payment intent does not match booking' }, { status: 400 })
    }

    if (intent.status !== 'succeeded') {
      return NextResponse.json({ error: `Payment intent not finalized (${intent.status})` }, { status: 409 })
    }

    await prisma.payment.updateMany({ where: { intentId }, data: { status: 'succeeded' } })
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', isPaid: true }
    })

    const emailResult = await sendBookingConfirmationEmail(bookingId)
    if (!emailResult.ok && emailResult.reason !== 'ALREADY_SENT') {
      return NextResponse.json({ error: emailResult.reason || 'EMAIL_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true, email: emailResult })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message || 'Server error' }, { status: 500 })
  }
}
