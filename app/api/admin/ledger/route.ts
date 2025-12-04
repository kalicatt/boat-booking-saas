import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export const runtime = 'nodejs'
import { auth } from '@/auth'
import { log } from '@/lib/logger'
import { sendAlert } from '@/lib/alerts'

const LEDGER_PROVIDER_ALIASES: Record<string, string> = {
  stripe_terminal: 'stripe_terminal',
  stripe: 'stripe_terminal',
  card: 'stripe_terminal',
  pos: 'stripe_terminal',
  cash: 'cash',
  caisse: 'cash',
  voucher: 'voucher',
  citypass: 'voucher',
  ancv: 'voucher',
  check: 'check',
  cheque: 'check',
  chequepapier: 'check',
  paypal: 'paypal',
  applepay: 'applepay',
  googlepay: 'googlepay'
}

const ALLOWED_LEDGER_PROVIDERS = new Set(
  Object.values(LEDGER_PROVIDER_ALIASES)
)

const normalizeLedgerProvider = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }
  const candidate = value.trim().toLowerCase()
  if (!candidate) {
    return null
  }
  if (LEDGER_PROVIDER_ALIASES[candidate]) {
    return LEDGER_PROVIDER_ALIASES[candidate]
  }
  if (ALLOWED_LEDGER_PROVIDERS.has(candidate)) {
    return candidate
  }
  return null
}

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
    const normalizedProvider = normalizeLedgerProvider(provider)
    if (!eventType || !normalizedProvider || typeof amount !== 'number' || !Number.isFinite(amount) || !currency) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const entry = await prisma.paymentLedger.create({
      data: {
        eventType,
        bookingId: bookingId ?? null,
        paymentId: paymentId ?? null,
        provider: normalizedProvider,
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
