import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const readRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']
const writeRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']
const DEFAULT_DAILY_BOATS = 4

const normalizeDay = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))

const ensureRole = async (allowedRoles: string[]) => {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function GET(request: NextRequest) {
  const { session, error } = await ensureRole(readRoles)
  if (!session) return error

  const searchParams = request.nextUrl.searchParams
  const dayParam = searchParams.get('day')
  const baseDate = dayParam ? new Date(dayParam) : new Date()
  if (Number.isNaN(baseDate.getTime())) {
    return NextResponse.json({ error: 'Invalid day parameter' }, { status: 400 })
  }
  const normalized = normalizeDay(baseDate)

  const record = await prisma.dailyBoatQuota.findUnique({ where: { day: normalized } })
  return NextResponse.json({
    day: normalized.toISOString(),
    boatsAvailable: record?.boatsAvailable ?? DEFAULT_DAILY_BOATS,
    note: record?.note ?? null,
    exists: Boolean(record)
  })
}

export async function POST(request: NextRequest) {
  const { session, error } = await ensureRole(writeRoles)
  if (!session) return error

  const body = (await request.json()) as {
    day?: string
    boatsAvailable?: number
    note?: string | null
  }

  if (!body.day) {
    return NextResponse.json({ error: 'Day is required' }, { status: 400 })
  }
  const parsedDay = new Date(body.day)
  if (Number.isNaN(parsedDay.getTime())) {
    return NextResponse.json({ error: 'Invalid day value' }, { status: 400 })
  }
  const normalized = normalizeDay(parsedDay)

  const boatsAvailable = Number(body.boatsAvailable)
  if (!Number.isInteger(boatsAvailable) || boatsAvailable < 1 || boatsAvailable > 4) {
    return NextResponse.json({ error: 'boatsAvailable must be between 1 and 4' }, { status: 400 })
  }

  const note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null

  const record = await prisma.dailyBoatQuota.upsert({
    where: { day: normalized },
    update: { boatsAvailable, note },
    create: { day: normalized, boatsAvailable, note }
  })

  return NextResponse.json({
    day: record.day.toISOString(),
    boatsAvailable: record.boatsAvailable,
    note: record.note ?? null
  })
}
