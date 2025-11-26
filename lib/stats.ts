import { prisma } from '@/lib/prisma'
import { getParisTodayISO } from '@/lib/time'

export interface StatsFilters {
  start?: string // YYYY-MM-DD
  end?: string   // YYYY-MM-DD
  status?: string[]
  language?: string[]
}

export async function getStats(filters: StatsFilters = {}) {
  const today = getParisTodayISO()
  const start = filters.start ? new Date(`${filters.start}T00:00:00.000Z`) : new Date(`${today.slice(0,7)}-01T00:00:00.000Z`)
  const end = filters.end ? new Date(`${filters.end}T23:59:59.999Z`) : new Date(`${today}T23:59:59.999Z`)

  const where: any = { startTime: { gte: start, lte: end } }
  if (filters.status && filters.status.length) where.status = { in: filters.status }
  if (filters.language && filters.language.length) where.language = { in: filters.language }

  const bookings = await prisma.booking.findMany({ where })

  const kpis = {
    bookings: bookings.length,
    embarked: bookings.filter(b => b.checkinStatus === 'EMBARQUED').length,
    noShow: bookings.filter(b => b.checkinStatus === 'NO_SHOW').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
    people: bookings.reduce((s,b)=> s + b.numberOfPeople, 0),
    adults: bookings.reduce((s,b)=> s + (b.adults||0), 0),
    children: bookings.reduce((s,b)=> s + (b.children||0), 0),
    babies: bookings.reduce((s,b)=> s + (b.babies||0), 0),
    revenue: bookings.reduce((s,b)=> s + (b.totalPrice||0), 0),
    avgPerBooking: bookings.length ? Math.round(bookings.reduce((s,b)=> s + (b.totalPrice||0), 0) / bookings.length) : 0,
    avgPerPerson: (() => { const ppl = bookings.reduce((s,b)=> s + b.numberOfPeople,0); return ppl ? Math.round(bookings.reduce((s,b)=> s + (b.totalPrice||0),0)/ppl) : 0 })(),
  }

  const statusDist: Record<string, number> = {}
  bookings.forEach(b => { statusDist[b.checkinStatus||'CONFIRMED'] = (statusDist[b.checkinStatus||'CONFIRMED']||0)+1 })

  const langDist: Record<string, number> = {}
  bookings.forEach(b => { langDist[b.language||'FR'] = (langDist[b.language||'FR']||0)+1 })

  const seriesDaily: Array<{ date: string; bookings: number; revenue: number }> = []
  const byDayMap: Record<string, { bookings: number; revenue: number }> = {}
  bookings.forEach(b => {
    const d = new Date(b.startTime)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
    const m = byDayMap[key] || { bookings: 0, revenue: 0 }
    m.bookings += 1
    m.revenue += (b.totalPrice||0)
    byDayMap[key] = m
  })
  Object.keys(byDayMap).sort().forEach(k => seriesDaily.push({ date: k, bookings: byDayMap[k].bookings, revenue: byDayMap[k].revenue }))

  const byHour: Array<{ hour: string; count: number; revenue: number }> = []
  const byHourMap: Record<string, { count: number; revenue: number }> = {}
  bookings.forEach(b => {
    const d = new Date(b.startTime)
    const h = String(d.getUTCHours()).padStart(2,'0')
    const key = `${h}:00`
    const m = byHourMap[key] || { count: 0, revenue: 0 }
    m.count += 1
    m.revenue += (b.totalPrice||0)
    byHourMap[key] = m
  })
  Object.keys(byHourMap).sort().forEach(k => byHour.push({ hour: k, count: byHourMap[k].count, revenue: byHourMap[k].revenue }))

  return { kpis, statusDist, langDist, seriesDaily, byHour }
}
