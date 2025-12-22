import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, addDays, startOfDay } from 'date-fns'
import { logger } from '@/lib/logger'

// Pagination defaults
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

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
  
  // Pagination parameters
  const cursor = searchParams.get('cursor') // ID of last item from previous page
  const limitParam = searchParams.get('limit')
  const limit = Math.min(
    Math.max(1, parseInt(limitParam || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  )
  
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
      orderBy: { startTime: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    // Determine if there are more results
    const hasMore = bookings.length > limit
    const results = hasMore ? bookings.slice(0, limit) : bookings
    const nextCursor = hasMore ? results[results.length - 1]?.id : null

    // Apply in-memory filters (payment provider, search query)
    let filtered = results
    
    if (payment) {
      filtered = filtered.filter(b => {
        const p = b.payments?.[0]
        if (!p) return false
        if (payment === 'voucher') return p.provider === 'voucher'
        return p.provider === payment
      })
    }

    if (q) {
      filtered = filtered.filter(booking => matchesQuery(booking, q))
    }

    // Return paginated response
    return NextResponse.json({
      data: filtered,
      pagination: {
        hasMore,
        nextCursor,
        limit,
        count: filtered.length,
      }
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error, route: '/api/admin/reservations' }, 'Failed to fetch reservations')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
