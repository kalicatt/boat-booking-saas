import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date') || '2025-12-23'
  
  const dayStartUtc = new Date(`${dateParam}T00:00:00.000Z`)
  const dayEndUtc = new Date(`${dateParam}T23:59:59.999Z`)
  
  const bookings = await prisma.booking.findMany({
    where: {
      startTime: { gte: dayStartUtc, lte: dayEndUtc },
      status: { not: 'CANCELLED' }
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      language: true,
      numberOfPeople: true,
      status: true,
      boat: { select: { name: true } }
    }
  })
  
  return NextResponse.json({
    date: dateParam,
    dayStartUtc: dayStartUtc.toISOString(),
    dayEndUtc: dayEndUtc.toISOString(),
    bookingsCount: bookings.length,
    bookings: bookings.map(b => ({
      id: b.id,
      startTime: b.startTime.toISOString(),
      startTimeLocal: b.startTime.toString(),
      endTime: b.endTime.toISOString(),
      language: b.language,
      languageUpperCase: b.language?.toUpperCase(),
      numberOfPeople: b.numberOfPeople,
      status: b.status,
      boat: b.boat?.name
    }))
  })
}
