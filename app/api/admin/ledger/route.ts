import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const entries = await prisma.paymentLedger.findMany({ orderBy: { occurredAt: 'desc' }, take: 200 })
    return NextResponse.json(entries)
  } catch (e: any) {
    return NextResponse.json({ error: 'Ledger fetch failed', details: String(e?.message||e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { eventType, bookingId, paymentId, provider, methodType, amount, currency, actorId, note } = body || {}
    if (!eventType || !provider || typeof amount !== 'number' || !currency) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const entry = await prisma.paymentLedger.create({ data: { eventType, bookingId, paymentId, provider, methodType, amount, currency, actorId, note } })
    return NextResponse.json(entry)
  } catch (e) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
