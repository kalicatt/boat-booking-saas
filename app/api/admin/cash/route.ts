import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
export const runtime = 'nodejs'
import { auth } from '@/auth'
import { log } from '@/lib/logger'
import { sendAlert } from '@/lib/alerts'

type ClosingBreakdownPayload = {
  bills?: Record<string, number>
  coins?: Record<string, number>
  notes?: string
  declaredAmountCents?: number
  computedAmountCents?: number
  expectedAmountCents?: number
  varianceCents?: number
  createdAt?: string
  checksAmountCents?: number
  vouchersAmountCents?: number
}

type CashAction
  = { action: 'open'; openingFloat?: number; openedById?: string }
  | { action: 'close'; sessionId: string; closingCount: number; closedById?: string; closingBreakdown?: ClosingBreakdownPayload | string | null }
  | { action: 'movement'; sessionId: string; kind: string; amount: number; note?: string | null }
  | { action: 'recount'; sessionId: string; closingCount?: number; closingBreakdown?: ClosingBreakdownPayload | string | null }

type CashOpenAction = Extract<CashAction, { action: 'open' }>
type CashCloseAction = Extract<CashAction, { action: 'close' }>
type CashMovementAction = Extract<CashAction, { action: 'movement' }>
type CashRecountAction = Extract<CashAction, { action: 'recount' }>

const isOpenAction = (payload: CashAction | { action?: string } | null | undefined): payload is CashOpenAction =>
  payload?.action === 'open'

const isCloseAction = (payload: CashAction | { action?: string } | null | undefined): payload is CashCloseAction =>
  payload?.action === 'close'

const isMovementAction = (payload: CashAction | { action?: string } | null | undefined): payload is CashMovementAction =>
  payload?.action === 'movement'

const isRecountAction = (payload: CashAction | { action?: string } | null | undefined): payload is CashRecountAction =>
  payload?.action === 'recount'

const parseBreakdown = (payload: ClosingBreakdownPayload | string | null | undefined): ClosingBreakdownPayload | null => {
  if (payload === null || payload === undefined) return null
  let base: unknown = payload
  if (typeof base === 'string') {
    try {
      base = JSON.parse(base)
    } catch {
      return null
    }
  }
  if (!base || typeof base !== 'object') return null
  const source = base as Record<string, unknown>
  const normalizeRecord = (value: unknown) => {
    if (!value || typeof value !== 'object') return undefined
    const entries = Object.entries(value as Record<string, unknown>)
    const result: Record<string, number> = {}
    for (const [key, entryValue] of entries) {
      if (typeof entryValue === 'number' && Number.isFinite(entryValue)) result[key] = entryValue
    }
    return Object.keys(result).length ? result : undefined
  }
  const normalized: ClosingBreakdownPayload = {}
  const bills = normalizeRecord(source.bills)
  if (bills) normalized.bills = bills
  const coins = normalizeRecord(source.coins)
  if (coins) normalized.coins = coins
  if (typeof source.notes === 'string') normalized.notes = source.notes
  if (typeof source.declaredAmountCents === 'number' && Number.isFinite(source.declaredAmountCents)) normalized.declaredAmountCents = source.declaredAmountCents
  if (typeof source.computedAmountCents === 'number' && Number.isFinite(source.computedAmountCents)) normalized.computedAmountCents = source.computedAmountCents
  if (typeof source.expectedAmountCents === 'number' && Number.isFinite(source.expectedAmountCents)) normalized.expectedAmountCents = source.expectedAmountCents
  if (typeof source.varianceCents === 'number' && Number.isFinite(source.varianceCents)) normalized.varianceCents = source.varianceCents
  if (typeof source.createdAt === 'string') normalized.createdAt = source.createdAt
  if (typeof source.checksAmountCents === 'number' && Number.isFinite(source.checksAmountCents)) normalized.checksAmountCents = source.checksAmountCents
  if (typeof source.vouchersAmountCents === 'number' && Number.isFinite(source.vouchersAmountCents)) normalized.vouchersAmountCents = source.vouchersAmountCents
  return Object.keys(normalized).length ? normalized : null
}

export async function GET() {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !['ADMIN','SUPERADMIN','SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const sessions = await prisma.cashSession.findMany({ include: { movements: true }, orderBy: { openedAt: 'desc' }, take: 20 })
    await log('info', 'Cash sessions fetched', { route: '/api/admin/cash' })
    return NextResponse.json(sessions)
  } catch (error) {
    await log('error', 'Cash fetch failed', { route: '/api/admin/cash' })
    await sendAlert('Cash fetch failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Cash fetch failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !['ADMIN','SUPERADMIN','SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = (await req.json()) as CashAction | { action?: string }
  if (isOpenAction(body)) {
    const { openingFloat, openedById } = body
    // Prevent multiple open sessions: if one is open (no closedAt), return it
    const existing = await prisma.cashSession.findFirst({ where: { closedAt: null }, orderBy: { openedAt: 'desc' } })
    if (existing) {
      await log('warn', 'Open cash attempted but existing session open', { route: '/api/admin/cash' })
      return NextResponse.json(existing, { status: 200 })
    }
    const s = await prisma.cashSession.create({ data: { openingFloat: openingFloat ?? 0, openedById } })
    // Ledger entry for opening float as PAID_IN (optional)
    if (typeof openingFloat === 'number' && openingFloat > 0) {
      await prisma.paymentLedger.create({ data: { eventType: 'PAID_IN', provider: 'cash', amount: openingFloat, currency: 'EUR' } })
    }
    await log('info', 'Cash session opened', { route: '/api/admin/cash' })
    return NextResponse.json(s)
  }
  if (isCloseAction(body)) {
    const { sessionId, closingCount, closedById, closingBreakdown } = body
    try {
      const breakdownPayload = parseBreakdown(closingBreakdown) ?? null
      const s = await prisma.cashSession.update({
        where: { id: sessionId },
        data: {
          closedAt: new Date(),
          closingCount,
          closedById,
          closingBreakdown: breakdownPayload ?? Prisma.JsonNull
        }
      })
      await log('info', 'Cash session closed', { route: '/api/admin/cash' })
      return NextResponse.json(s)
    } catch (error) {
      await log('error', 'Cash close failed', { route: '/api/admin/cash' })
      await sendAlert('Cash close failed', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: 'Cash close failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
  }
  if (isMovementAction(body)) {
    const { sessionId, kind, amount, note } = body
    try {
      const movement = await prisma.cashMovement.create({ data: { sessionId, kind, amount, note } })
      // Mirror cash movement to ledger
      await prisma.paymentLedger.create({ data: { eventType: kind.toUpperCase(), provider: 'cash', amount: amount, currency: 'EUR', note } })
      await log('info', 'Cash movement created', { route: '/api/admin/cash' })
      return NextResponse.json(movement)
    } catch (error) {
      await log('error', 'Cash movement failed', { route: '/api/admin/cash' })
      await sendAlert('Cash movement failed', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: 'Cash movement failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
  }
  if (isRecountAction(body)) {
    const { sessionId, closingCount, closingBreakdown } = body
    try {
      const breakdownPayload = parseBreakdown(closingBreakdown)
      const data: Prisma.CashSessionUpdateInput = {
        closingBreakdown: breakdownPayload ?? Prisma.JsonNull
      }
      if (typeof closingCount === 'number' && Number.isFinite(closingCount)) {
        data.closingCount = closingCount
      }
      const updated = await prisma.cashSession.update({ where: { id: sessionId }, data })
      await log('info', 'Cash session recounted', { route: '/api/admin/cash' })
      return NextResponse.json(updated)
    } catch (error) {
      await log('error', 'Cash recount failed', { route: '/api/admin/cash' })
      await sendAlert('Cash recount failed', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: 'Cash recount failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
