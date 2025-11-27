import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
export const runtime = 'nodejs'
import { computeVatFromGross } from '@/lib/vat'
import { auth } from '@/auth'
import { log } from '@/lib/logger'
import { sendAlert } from '@/lib/alerts'

export async function GET() {
  const session = await auth()
  const role = (session as any)?.user?.role
  if (!session || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const closures = await prisma.dailyClosure.findMany({ orderBy: { day: 'desc' }, take: 60 })
    await log('info', 'Closures fetched', { route: '/api/admin/closures' })
    return NextResponse.json(closures)
  } catch (e: any) {
    await log('error', 'Closures fetch failed', { route: '/api/admin/closures' })
    await sendAlert('Closures fetch failed', { error: String(e?.message||e) })
    return NextResponse.json({ error: 'Closures fetch failed', details: String(e?.message||e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const role = (session as any)?.user?.role
  if (!session || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
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
    await log('error', 'Ledger read failed', { route: '/api/admin/closures' })
    await sendAlert('Ledger read failed during closure', { error: String(e?.message||e) })
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
    } else if (e.amount && e.provider !== 'voucher') {
      const v = computeVatFromGross(e.amount)
      vatTotals.net += v.net
      vatTotals.vat += v.vat
      vatTotals.gross += v.gross
    }
  })
  const snapshot = { totals, vouchers, count: entries.length, vat: vatTotals }
  const json = JSON.stringify(snapshot)
  const hash = crypto.createHash('sha256').update(json).digest('hex')

  try {
    const closure = await prisma.dailyClosure.create({ data: { day: start, closedById, totalsJson: json, hash, locked: true } })
    await log('info', 'Daily closure created', { route: '/api/admin/closures' })
    return NextResponse.json(closure)
  } catch (e: any) {
    await log('error', 'Closure write failed', { route: '/api/admin/closures' })
    await sendAlert('Closure write failed', { error: String(e?.message||e) })
    return NextResponse.json({ error: 'Closure write failed', details: String(e?.message||e) }, { status: 500 })
  }
}
