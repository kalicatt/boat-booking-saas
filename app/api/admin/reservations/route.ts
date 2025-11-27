import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, addDays, startOfDay } from 'date-fns'

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
        status: { not: 'CANCELLED' },
        ...(q ? { OR: [
          { user: { firstName: { contains: q, mode: 'insensitive' } } },
          { user: { lastName: { contains: q, mode: 'insensitive' } } }
        ] } : {})
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        payments: { select: { id: true, provider: true, methodType: true } }
      },
      orderBy: { startTime: 'asc' }
    })
    const filtered = payment ? bookings.filter(b => {
      const p = b.payments?.[0]
      if (!p) return false
      if (payment === 'voucher') return p.provider === 'voucher'
      return p.provider === payment
    }) : bookings
    return NextResponse.json(filtered)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
