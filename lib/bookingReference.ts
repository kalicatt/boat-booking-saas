import type { Prisma, PrismaClient } from '@prisma/client'
import { format } from 'date-fns'

const REFERENCE_PREFIX = 'SN'

const pad = (value: number, length = 4) => value.toString().padStart(length, '0')

const sequenceNameForSeason = (season: string) => `booking_ref_${season}`

const computeSeasonFromDate = (date: Date) => format(date, 'yyyy')

export async function generateSeasonalBookingReference(
  client: PrismaClient | Prisma.TransactionClient,
  departureDate: Date
): Promise<string> {
  const season = computeSeasonFromDate(departureDate)
  const sequenceName = sequenceNameForSeason(season)

  const sequence = await client.sequence.upsert({
    where: { name: sequenceName },
    update: { current: { increment: 1 } },
    create: { name: sequenceName, current: 1 }
  })

  const counter = sequence.current
  return `${REFERENCE_PREFIX}-${season.slice(-2)}-${pad(counter)}`
}

export function buildBookingReferenceLabel(reference: string | null | undefined, fallback: string) {
  return reference ?? fallback
}
