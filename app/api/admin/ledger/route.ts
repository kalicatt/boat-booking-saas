import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export const runtime = 'nodejs'
import { auth } from '@/auth'
import { log } from '@/lib/logger'
import { sendAlert } from '@/lib/alerts'

interface CreateLedgerPayload {
  eventType: string
  provider: string
  amount: number
  currency: string
  bookingId?: string | null
  paymentId?: string | null
  methodType?: string | null
  actorId?: string | null
  note?: string | null
}

export async function GET() {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !['ADMIN','SUPERADMIN','SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const entries = await prisma.paymentLedger.findMany({ orderBy: { occurredAt: 'desc' }, take: 200 })
    await log('info', 'Ledger fetched', { route: '/api/admin/ledger' })
    return NextResponse.json(entries)
  } catch (error) {
    await log('error', 'Ledger fetch failed', { route: '/api/admin/ledger' })
    await sendAlert('Ledger fetch failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Ledger fetch failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !['ADMIN','SUPERADMIN','SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = (await req.json()) as Partial<CreateLedgerPayload> | null
    if (!body) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }
    const { eventType, bookingId, paymentId, provider, methodType, amount, currency, actorId, note } = body
    if (!eventType || !provider || typeof amount !== 'number' || !Number.isFinite(amount) || !currency) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const entry = await prisma.paymentLedger.create({
      data: {
        eventType,
        bookingId: bookingId ?? null,
        paymentId: paymentId ?? null,
        provider,
        methodType: methodType ?? null,
        amount,
        currency,
        actorId: actorId ?? null,
        note: note ?? null,
      }
    })
    await log('info', 'Ledger entry created', { route: '/api/admin/ledger' })
    return NextResponse.json(entry)
  } catch (error) {
    await log('error', 'Ledger create failed', { route: '/api/admin/ledger' })
    await sendAlert('Ledger create failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
