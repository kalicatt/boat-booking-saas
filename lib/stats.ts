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

  const bookings = await prisma.booking.findMany({ where, include: { payments: true, user: true, boat: true } })

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
      const payments = bookings.flatMap(b=> b.payments||[]).filter(p=> isPaidStatus(p.status))
      const cashier = payments.filter(p=> {
        const prov = (p.provider||'').toLowerCase()
        const meth = (p.methodType||'').toLowerCase()
        const isVoucher = prov === 'voucher' || meth === 'ancv' || meth === 'citypass' || prov.includes('city') || prov.includes('ancv')
        return !isVoucher
      })
      const euroFromPayments = cashier.reduce((s,p)=> s + (p.amount||0), 0) / 100
      // Fallback: bookings marked paid with no non-voucher payments
      let euroFallback = 0
      for (const b of bookings) {
        const paidPs = (b.payments||[]).filter(p=> isPaidStatus(p.status))
        const hasNonVoucherPaid = paidPs.some(p=> { const prov = (p.provider||'').toLowerCase(); const meth = (p.methodType||'').toLowerCase(); return !(prov === 'voucher' || meth === 'ancv' || meth === 'citypass' || prov.includes('ancv') || prov.includes('city')) })
        if (!hasNonVoucherPaid && (b as any).isPaid && ((b.totalPrice||0) > 0)) {
          euroFallback += (b.totalPrice || 0)
        }
      }
      return Math.round(euroFromPayments + euroFallback)
    })(),
    avgPerBooking: (()=>{ const count = bookings.length; const total = bookings.reduce((s,b)=> s + (b.totalPrice||0),0); return count ? Math.round(total / count) : 0 })(),
    avgPerPerson: (() => { const ppl = bookings.reduce((s,b)=> s + b.numberOfPeople,0); const total = bookings.reduce((s,b)=> s + (b.totalPrice||0),0); return ppl ? Math.round(total/ppl) : 0 })(),
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
  const paymentsAll = bookings.flatMap(b=> b.payments||[]).filter(p=> isPaidStatus(p.status))
  const sumCents = (arr: any[]) => Math.round(arr.reduce((s,p)=> s + (p.amount||0), 0))
  // Monetary breakdown (excluding vouchers from caisse total), vouchers counted as quantities
  let ANCVCount = 0
  let CityPassCount = 0
  for (const b of bookings) {
    const ps = (b.payments||[]).filter(p=> isPaidStatus(p.status))
    const hasCityPass = ps.some(p=> (p.provider === 'voucher' && p.methodType === 'CityPass') || (p.methodType||'').toLowerCase().includes('city'))
    const hasANCV = ps.some(p=> (p.provider === 'voucher' && p.methodType === 'ANCV') || (p.methodType||'').toLowerCase().includes('ancv'))
    if (hasCityPass) CityPassCount += (b.adults||0)
    if (hasANCV) ANCVCount += (b.numberOfPeople||0)
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
  const accounting = bookings.flatMap(b => {
    const d = new Date(b.startTime)
    const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
    const time = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`
    const name = `${(b as any).user?.lastName || ''} ${(b as any).user?.firstName || ''}`.trim() || '-' 
    const boatName = (b as any).boat?.name || '-'
    const people = b.numberOfPeople
    if (!b.payments || b.payments.length === 0) {
      return [] as any[]
    }
    return b.payments
      .filter(p => isPaidStatus(p.status))
      .map(p => {
        let method = p.provider
        if (p.provider === 'voucher' && (p.methodType === 'ANCV' || p.methodType === 'CityPass')) method = p.methodType
        if (p.provider === 'card') method = 'Card'
        if (p.provider === 'cash') method = 'Cash'
        if (p.provider === 'paypal') method = 'PayPal'
        if (p.provider === 'applepay') method = 'Apple Pay'
        if (p.provider === 'googlepay') method = 'Google Pay'
        const isVoucher = p.provider === 'voucher' && (p.methodType === 'ANCV' || p.methodType === 'CityPass')
        return {
          bookingId: b.id,
          boat: boatName,
          date,
          time,
          name,
          people,
          amount: isVoucher ? 0 : (p.amount || 0) / 100,
          method,
        }
      })
  }).sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time))

  // Append fallback accounting entries for paid bookings with no non-voucher payment records
  for (const b of bookings) {
    const paidPs = (b.payments||[]).filter(p=> isPaidStatus(p.status))
    const hasNonVoucherPaid = paidPs.some(p=> { const prov = (p.provider||'').toLowerCase(); const meth = (p.methodType||'').toLowerCase(); return !(prov === 'voucher' || meth === 'ancv' || meth === 'citypass' || prov.includes('ancv') || prov.includes('city')) })
    if (!hasNonVoucherPaid && (b as any).isPaid && ((b.totalPrice||0) > 0)) {
      const d = new Date(b.startTime)
      const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
      const time = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`
      accounting.push({
        bookingId: b.id,
        boat: (b as any).boat?.name || '-',
        date,
        time,
        name: `${(b as any).user?.lastName || ''} ${(b as any).user?.firstName || ''}`.trim() || '-',
        people: b.numberOfPeople || 0,
        amount: (b.totalPrice || 0),
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
