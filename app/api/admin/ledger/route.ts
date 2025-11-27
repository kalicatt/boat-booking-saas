import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export const runtime = 'nodejs'
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
    const entries = await prisma.paymentLedger.findMany({ orderBy: { occurredAt: 'desc' }, take: 200 })
    await log('info', 'Ledger fetched', { route: '/api/admin/ledger' })
    return NextResponse.json(entries)
  } catch (e: any) {
    await log('error', 'Ledger fetch failed', { route: '/api/admin/ledger' })
    await sendAlert('Ledger fetch failed', { error: String(e?.message||e) })
    return NextResponse.json({ error: 'Ledger fetch failed', details: String(e?.message||e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const role = (session as any)?.user?.role
  if (!session || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const { eventType, bookingId, paymentId, provider, methodType, amount, currency, actorId, note } = body || {}
    if (!eventType || !provider || typeof amount !== 'number' || !currency) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const entry = await prisma.paymentLedger.create({ data: { eventType, bookingId, paymentId, provider, methodType, amount, currency, actorId, note } })
    await log('info', 'Ledger entry created', { route: '/api/admin/ledger' })
    return NextResponse.json(entry)
  } catch (e) {
    await log('error', 'Ledger create failed', { route: '/api/admin/ledger' })
    await sendAlert('Ledger create failed', { error: String((e as any)?.message||e) })
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
