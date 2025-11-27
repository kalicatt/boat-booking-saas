import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

export async function GET() {
  const closures = await prisma.dailyClosure.findMany({ orderBy: { day: 'desc' }, take: 60 })
  return NextResponse.json(closures)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { day, closedById } = body
  const start = new Date(day)
  const end = new Date(day)
  start.setUTCHours(0,0,0,0)
  end.setUTCHours(23,59,59,999)

  // Compute totals from PaymentLedger for the day
  const entries = await prisma.paymentLedger.findMany({ where: { occurredAt: { gte: start, lte: end } } })
  const totals: Record<string, number> = {}
  const vouchers: Record<string, number> = {}
  entries.forEach(e => {
    if (e.provider === 'voucher') {
      const key = e.methodType || 'voucher'
      vouchers[key] = (vouchers[key] || 0) + Math.round((e.amount || 0))
    } else {
      totals[e.provider] = (totals[e.provider] || 0) + Math.round((e.amount || 0))
    }
  })
  const snapshot = { totals, vouchers, count: entries.length }
  const json = JSON.stringify(snapshot)
  const hash = crypto.createHash('sha256').update(json).digest('hex')

  const closure = await prisma.dailyClosure.create({ data: { day: start, closedById, totalsJson: json, hash } })
  return NextResponse.json(closure)
}
