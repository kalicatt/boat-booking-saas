import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export const runtime = 'nodejs'
import { auth } from '@/auth'
import { log } from '@/lib/logger'
import { sendAlert } from '@/lib/alerts'

export async function GET() {
  const session = await auth()
  const role = ((session as any)?.user?.role || 'GUEST') as string
  if (!session || !['ADMIN','SUPERADMIN','SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const sessions = await prisma.cashSession.findMany({ include: { movements: true }, orderBy: { openedAt: 'desc' }, take: 20 })
    await log('info', 'Cash sessions fetched', { route: '/api/admin/cash' })
    return NextResponse.json(sessions)
  } catch (e: any) {
    await log('error', 'Cash fetch failed', { route: '/api/admin/cash' })
    await sendAlert('Cash fetch failed', { error: String(e?.message||e) })
    return NextResponse.json({ error: 'Cash fetch failed', details: String(e?.message||e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const role = ((session as any)?.user?.role || 'GUEST') as string
  if (!session || !['ADMIN','SUPERADMIN','SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { action } = body
  if (action === 'open') {
    const { openingFloat, openedById } = body
    // Prevent multiple open sessions: if one is open (no closedAt), return it
    const existing = await prisma.cashSession.findFirst({ where: { closedAt: null }, orderBy: { openedAt: 'desc' } })
    if (existing) {
      await log('warn', 'Open cash attempted but existing session open', { route: '/api/admin/cash' })
      return NextResponse.json(existing, { status: 200 })
    }
    const s = await prisma.cashSession.create({ data: { openingFloat: openingFloat ?? 0, openedById } })
    // Ledger entry for opening float as PAID_IN (optional)
    if (openingFloat && openingFloat > 0) {
      await prisma.paymentLedger.create({ data: { eventType: 'PAID_IN', provider: 'cash', amount: openingFloat, currency: 'EUR' } })
    }
    await log('info', 'Cash session opened', { route: '/api/admin/cash' })
    return NextResponse.json(s)
  }
  if (action === 'close') {
    const { sessionId, closingCount, closedById } = body
    try {
      const s = await prisma.cashSession.update({ where: { id: sessionId }, data: { closedAt: new Date(), closingCount, closedById } })
      await log('info', 'Cash session closed', { route: '/api/admin/cash' })
      return NextResponse.json(s)
    } catch (e: any) {
      await log('error', 'Cash close failed', { route: '/api/admin/cash' })
      await sendAlert('Cash close failed', { error: String(e?.message||e) })
      return NextResponse.json({ error: 'Cash close failed', details: String(e?.message||e) }, { status: 500 })
    }
  }
  if (action === 'movement') {
    const { sessionId, kind, amount, note } = body
    try {
      const m = await prisma.cashMovement.create({ data: { sessionId, kind, amount, note } })
    // Mirror cash movement to ledger
      await prisma.paymentLedger.create({ data: { eventType: kind.toUpperCase(), provider: 'cash', amount: amount, currency: 'EUR', note } })
      await log('info', 'Cash movement created', { route: '/api/admin/cash' })
      return NextResponse.json(m)
    } catch (e: any) {
      await log('error', 'Cash movement failed', { route: '/api/admin/cash' })
      await sendAlert('Cash movement failed', { error: String(e?.message||e) })
      return NextResponse.json({ error: 'Cash movement failed', details: String(e?.message||e) }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
