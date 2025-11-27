import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const sessions = await prisma.cashSession.findMany({ include: { movements: true }, orderBy: { openedAt: 'desc' }, take: 20 })
    return NextResponse.json(sessions)
  } catch (e: any) {
    return NextResponse.json({ error: 'Cash fetch failed', details: String(e?.message||e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const { action } = body
  if (action === 'open') {
    const { openingFloat, openedById } = body
    const s = await prisma.cashSession.create({ data: { openingFloat: openingFloat ?? 0, openedById } })
    // Ledger entry for opening float as PAID_IN (optional)
    if (openingFloat && openingFloat > 0) {
      await prisma.paymentLedger.create({ data: { eventType: 'PAID_IN', provider: 'cash', amount: openingFloat, currency: 'EUR' } })
    }
    return NextResponse.json(s)
  }
  if (action === 'close') {
    const { sessionId, closingCount, closedById } = body
    try {
      const s = await prisma.cashSession.update({ where: { id: sessionId }, data: { closedAt: new Date(), closingCount, closedById } })
      return NextResponse.json(s)
    } catch (e: any) {
      return NextResponse.json({ error: 'Cash close failed', details: String(e?.message||e) }, { status: 500 })
    }
  }
  if (action === 'movement') {
    const { sessionId, kind, amount, note } = body
    try {
      const m = await prisma.cashMovement.create({ data: { sessionId, kind, amount, note } })
    // Mirror cash movement to ledger
      await prisma.paymentLedger.create({ data: { eventType: kind.toUpperCase(), provider: 'cash', amount: amount, currency: 'EUR', note } })
      return NextResponse.json(m)
    } catch (e: any) {
      return NextResponse.json({ error: 'Cash movement failed', details: String(e?.message||e) }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
