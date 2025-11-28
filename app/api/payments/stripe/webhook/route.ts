import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { computeVatFromGross } from '@/lib/vat'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const preferredRegion = 'auto'

export async function POST(req: Request){
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if(!stripeKey || !webhookSecret){
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 500 })
  }
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-11-17.clover' })
  let rawBody: string
  try { rawBody = await req.text() } catch { return NextResponse.json({ error: 'Raw body read failed' }, { status: 400 }) }
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig || '', webhookSecret)
  } catch (e:any){
    await log('warn','Stripe signature verification failed',{ route:'/api/payments/stripe/webhook' })
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  if(event.type === 'checkout.session.completed'){
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.bookingId
    if(!bookingId){
      await log('warn','Checkout session missing bookingId',{ route:'/api/payments/stripe/webhook' })
      return NextResponse.json({ received: true })
    }
    try {
      // Idempotent: if payment already recorded skip
      const existing = await prisma.payment.findFirst({ where: { intentId: session.payment_intent as string } })
      if(existing){
        return NextResponse.json({ received: true })
      }
      const amountTotal = session.amount_total || 0
      const currency = (session.currency || 'eur').toUpperCase()
      const payment = await prisma.payment.create({ data: {
        provider: 'stripe',
        bookingId,
        intentId: session.payment_intent as string,
        orderId: session.id,
        amount: amountTotal,
        currency,
        status: 'succeeded',
        rawPayload: session as any
      }})
      // Mark booking paid
      await prisma.booking.update({ where: { id: bookingId }, data: { isPaid: true, status: 'CONFIRMED' } })
      // VAT breakdown
      const vat = computeVatFromGross(amountTotal)
      await prisma.paymentLedger.create({ data: {
        eventType: 'PAYMENT',
        bookingId,
        paymentId: payment.id,
        provider: 'card',
        methodType: 'stripe',
        amount: amountTotal,
        currency,
        vatRate: vat.ratePercent,
        netAmount: vat.net,
        vatAmount: vat.vat,
        grossAmount: vat.gross
      }})
      await log('info','Stripe payment recorded',{ route:'/api/payments/stripe/webhook', bookingId })
    } catch (e:any){
      await log('error','Stripe payment handling failed',{ route:'/api/payments/stripe/webhook', bookingId })
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

export async function GET(){
  return NextResponse.json({ ok: true })
}