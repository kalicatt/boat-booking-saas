import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, addDays, startOfDay } from 'date-fns'

const normalizeQuery = (value: string) => value.trim().toLowerCase()
const compactQuery = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase()
const digitsOnly = (value: string) => value.replace(/\D/g, '')

const matchesQuery = (booking: {
  user: {
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
  } | null
  publicReference: string | null
}, rawQuery: string) => {
  const normalized = normalizeQuery(rawQuery)
  if (!normalized) return true
  const compact = compactQuery(rawQuery)
  const numeric = digitsOnly(rawQuery)
  const reference = booking.publicReference ?? ''
  const referenceNormalized = reference.toLowerCase()
  const referenceCompact = compactQuery(reference)
  const referenceDigits = digitsOnly(reference)

  if (referenceNormalized.includes(normalized)) return true
  if (compact && referenceCompact.includes(compact)) return true
  if (numeric && referenceDigits.includes(numeric)) return true

  if (!booking.user) return false

  const { firstName, lastName, email, phone } = booking.user
  const first = (firstName ?? '').toLowerCase()
  const last = (lastName ?? '').toLowerCase()
  const full = `${first} ${last}`.trim()

  if (first.includes(normalized) || last.includes(normalized) || (full && full.includes(normalized))) {
    return true
  }

  if ((email ?? '').toLowerCase().includes(normalized)) {
    return true
  }

  if (numeric && digitsOnly(phone ?? '').includes(numeric)) {
    return true
  }

  return false
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')
  const q = (searchParams.get('q') || '').trim()
  const payment = (searchParams.get('payment') || '').trim()
  if (!startParam || !endParam) return NextResponse.json({ error: 'Missing range' }, { status: 400 })
  try {
    const start = parseISO(startParam)
    const endRaw = parseISO(endParam)
    const end = addDays(startOfDay(endRaw), 1)
    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: start, lt: end },
        status: { not: 'CANCELLED' }
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        payments: { select: { id: true, provider: true, methodType: true, status: true } }
      },
      orderBy: { startTime: 'asc' }
    })

    const paymentFiltered = payment ? bookings.filter(b => {
      const p = b.payments?.[0]
      if (!p) return false
      if (payment === 'voucher') return p.provider === 'voucher'
      return p.provider === payment
    }) : bookings

    const queryFiltered = q ? paymentFiltered.filter(booking => matchesQuery(booking, q)) : paymentFiltered

    return NextResponse.json(queryFiltered)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(msg)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
