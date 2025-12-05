import { prisma } from '@/lib/prisma'
import { getParisTodayISO } from '@/lib/time'
import type { Payment, Prisma, BookingStatus } from '@prisma/client'

export interface StatsFilters {
  start?: string // YYYY-MM-DD
  end?: string   // YYYY-MM-DD
  status?: BookingStatus[]
  language?: string[]
}

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    payments: true
    user: true
    boat: true
  }
}>

interface AccountingEntry {
  bookingId: string
  boat: string
  date: string
  time: string
  name: string
  people: number
  amount: number
  method: string
}

export async function getStats(filters: StatsFilters = {}) {
  const today = getParisTodayISO()
  const start = filters.start ? new Date(`${filters.start}T00:00:00.000Z`) : new Date(`${today.slice(0,7)}-01T00:00:00.000Z`)
  const end = filters.end ? new Date(`${filters.end}T23:59:59.999Z`) : new Date(`${today}T23:59:59.999Z`)

  const where: Prisma.BookingWhereInput = { startTime: { gte: start, lte: end } }
  if (filters.status && filters.status.length) where.status = { in: filters.status }
  if (filters.language && filters.language.length) where.language = { in: filters.language }

  const bookings: BookingWithRelations[] = await prisma.booking.findMany({ where, include: { payments: true, user: true, boat: true } })

  const isPaidStatus = (s?: string) => {
    const v = (s || '').toLowerCase()
    return v === 'succeeded' || v === 'completed' || v === 'paid' || v === 'captured' || v === 'authorized' || v === 'settled'
  }

  const kpis = {
    bookings: bookings.length,
    embarked: bookings.filter(b => b.checkinStatus === 'EMBARQUED').length,
    noShow: bookings.filter(b => b.checkinStatus === 'NO_SHOW').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
    people: bookings.reduce((s,b)=> s + b.numberOfPeople, 0),
    adults: bookings.reduce((s,b)=> s + (b.adults||0), 0),
    children: bookings.reduce((s,b)=> s + (b.children||0), 0),
    babies: bookings.reduce((s,b)=> s + (b.babies||0), 0),
    revenue: (() => {
      // Compute cashier total from payments excluding vouchers (ANCV/CityPass)
      const paidPayments = bookings
        .flatMap(booking => booking.payments)
        .filter(payment => isPaidStatus(payment.status))
      const cashier = paidPayments.filter(payment => {
        const provider = payment.provider.toLowerCase()
        const method = (payment.methodType || '').toLowerCase()
        const isVoucher = provider === 'voucher' || method === 'ancv' || method === 'citypass' || provider.includes('city') || provider.includes('ancv')
        return !isVoucher
      })
      const euroFromPayments = cashier.reduce((total, payment) => total + payment.amount, 0) / 100
      // Fallback: bookings marked paid with no non-voucher payments
      let euroFallback = 0
      for (const booking of bookings) {
        const paidForBooking = booking.payments.filter(payment => isPaidStatus(payment.status))
        const hasNonVoucherPaid = paidForBooking.some(payment => {
          const provider = payment.provider.toLowerCase()
          const method = (payment.methodType || '').toLowerCase()
          return !(provider === 'voucher' || method === 'ancv' || method === 'citypass' || provider.includes('ancv') || provider.includes('city'))
        })
        if (!hasNonVoucherPaid && booking.isPaid && booking.totalPrice > 0) {
          euroFallback += booking.totalPrice
        }
      }
      return Math.round(euroFromPayments + euroFallback)
    })(),
    avgPerBooking: (() => {
      const count = bookings.length
      const total = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
      return count ? Math.round(total / count) : 0
    })(),
    avgPerPerson: (() => {
      const peopleCount = bookings.reduce((sum, booking) => sum + booking.numberOfPeople, 0)
      const total = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
      return peopleCount ? Math.round(total / peopleCount) : 0
    })(),
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

  // Build payment breakdown
  const paymentsAll = bookings.flatMap(booking => booking.payments).filter(payment => isPaidStatus(payment.status))
  const sumCents = (arr: Payment[]) => Math.round(arr.reduce((sum, payment) => sum + payment.amount, 0))
  // Monetary breakdown (excluding vouchers from caisse total), vouchers counted as quantities
  let ANCVCount = 0
  let CityPassCount = 0
  for (const booking of bookings) {
    const paidForBooking = booking.payments.filter(payment => isPaidStatus(payment.status))
    const hasCityPass = paidForBooking.some(payment => (payment.provider === 'voucher' && payment.methodType === 'CityPass') || (payment.methodType || '').toLowerCase().includes('city'))
    const hasANCV = paidForBooking.some(payment => (payment.provider === 'voucher' && payment.methodType === 'ANCV') || (payment.methodType || '').toLowerCase().includes('ancv'))
    if (hasCityPass) CityPassCount += booking.adults ?? 0
    if (hasANCV) ANCVCount += booking.numberOfPeople ?? 0
  }
  const breakdown = {
    cash: sumCents(paymentsAll.filter(p=> ((p.provider||'').toLowerCase() === 'cash'))) / 100,
    card: sumCents(paymentsAll.filter(p=> { const prov = (p.provider||'').toLowerCase(); return prov === 'card' || prov === 'stripe' })) / 100,
    paypal: sumCents(paymentsAll.filter(p=> ((p.provider||'').toLowerCase() === 'paypal'))) / 100,
    applepay: sumCents(paymentsAll.filter(p=> { const prov = (p.provider||'').toLowerCase(); return prov === 'applepay' || prov.includes('apple') })) / 100,
    googlepay: sumCents(paymentsAll.filter(p=> { const prov = (p.provider||'').toLowerCase(); return prov === 'googlepay' || prov.includes('google') })) / 100,
    ANCV: ANCVCount,           // counts, not euros
    CityPass: CityPassCount,   // counts, not euros
  }

  // Note: accounting fallback entries will be appended below after accounting array is declared

  // Accounting lines per payment (paper trace)
  const accounting = bookings.flatMap<AccountingEntry>(booking => {
    const d = new Date(booking.startTime)
    const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
    const time = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`
    const name = `${booking.user.lastName ?? ''} ${booking.user.firstName ?? ''}`.trim() || '-'
    const boatName = booking.boat?.name ?? '-'
    const people = booking.numberOfPeople
    if (booking.payments.length === 0) {
      return []
    }
    return booking.payments
      .filter(payment => isPaidStatus(payment.status))
      .map<AccountingEntry>(payment => {
        let method = payment.provider
        if (payment.provider === 'voucher' && (payment.methodType === 'ANCV' || payment.methodType === 'CityPass')) method = payment.methodType || method
        if (payment.provider === 'card') method = 'Card'
        if (payment.provider === 'cash') method = 'Cash'
        if (payment.provider === 'paypal') method = 'PayPal'
        if (payment.provider === 'applepay') method = 'Apple Pay'
        if (payment.provider === 'googlepay') method = 'Google Pay'
        const isVoucher = payment.provider === 'voucher' && (payment.methodType === 'ANCV' || payment.methodType === 'CityPass')
        return {
          bookingId: booking.id,
          boat: boatName,
          date,
          time,
          name,
          people,
          amount: isVoucher ? 0 : payment.amount / 100,
          method,
        }
      })
  }).sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time))

  // Append fallback accounting entries for paid bookings with no non-voucher payment records
  for (const booking of bookings) {
    const paidForBooking = booking.payments.filter(payment => isPaidStatus(payment.status))
    const hasNonVoucherPaid = paidForBooking.some(payment => {
      const provider = payment.provider.toLowerCase()
      const method = (payment.methodType || '').toLowerCase()
      return !(provider === 'voucher' || method === 'ancv' || method === 'citypass' || provider.includes('ancv') || provider.includes('city'))
    })
    if (!hasNonVoucherPaid && booking.isPaid && booking.totalPrice > 0) {
      const d = new Date(booking.startTime)
      const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
      const time = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`
      accounting.push({
        bookingId: booking.id,
        boat: booking.boat?.name ?? '-',
        date,
        time,
        name: `${booking.user.lastName ?? ''} ${booking.user.firstName ?? ''}`.trim() || '-',
        people: booking.numberOfPeople || 0,
        amount: booking.totalPrice || 0,
        method: 'Paid (no record)'
      })
    }
  }

  // Build client-friendly structure
  const byLanguage = Object.entries(langDist).map(([language, count])=> ({ language, _count: { id: count } }))
  const statusDistOut = statusDist
  const seriesDailyOut = seriesDaily
  const byHourOut = byHour

  return {
    revenue: kpis.revenue,
    passengers: kpis.people,
    bookingsCount: kpis.bookings,
    noShow: kpis.noShow,
    cancelled: kpis.cancelled,
    avgPerBooking: kpis.avgPerBooking,
    avgPerPerson: kpis.avgPerPerson,
    byLanguage,
    statusDist: statusDistOut,
    seriesDaily: seriesDailyOut,
    byHour: byHourOut,
    paymentBreakdown: breakdown,
    accounting
  }
}
