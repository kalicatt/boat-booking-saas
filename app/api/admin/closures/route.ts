import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET() {
  try {
    const closures = await prisma.dailyClosure.findMany({ orderBy: { day: 'desc' }, take: 60 })
    return NextResponse.json(closures)
  } catch (e: any) {
    return NextResponse.json({ error: 'Closures fetch failed', details: String(e?.message||e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const { day, closedById } = body
  const start = new Date(day)
  const end = new Date(day)
  start.setUTCHours(0,0,0,0)
  end.setUTCHours(23,59,59,999)

  // Compute totals from PaymentLedger for the day
  let entries: any[] = []
  try {
    entries = await prisma.paymentLedger.findMany({ where: { occurredAt: { gte: start, lte: end } } })
  } catch (e: any) {
    return NextResponse.json({ error: 'Ledger read failed', details: String(e?.message||e) }, { status: 500 })
  }
  const totals: Record<string, number> = {}
  const vouchers: Record<string, number> = {}
  const vatTotals: { net: number; vat: number; gross: number } = { net: 0, vat: 0, gross: 0 }
  entries.forEach(e => {
    if (e.provider === 'voucher') {
      const key = e.methodType || 'voucher'
      vouchers[key] = (vouchers[key] || 0) + Math.round((e.amount || 0))
    } else {
      totals[e.provider] = (totals[e.provider] || 0) + Math.round((e.amount || 0))
    }
    if (e.netAmount && e.vatAmount && e.grossAmount) {
      vatTotals.net += e.netAmount
      vatTotals.vat += e.vatAmount
      vatTotals.gross += e.grossAmount
    }
  })
  const snapshot = { totals, vouchers, count: entries.length, vat: vatTotals }
  const json = JSON.stringify(snapshot)
  const hash = crypto.createHash('sha256').update(json).digest('hex')

  try {
    const closure = await prisma.dailyClosure.create({ data: { day: start, closedById, totalsJson: json, hash, locked: true } })
    return NextResponse.json(closure)
  } catch (e: any) {
    return NextResponse.json({ error: 'Closure write failed', details: String(e?.message||e) }, { status: 500 })
  }
}
