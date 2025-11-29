"use client"
import useSWR from 'swr'
import { useState } from 'react'
import { format } from 'date-fns'
import type { PaymentLedger } from '@prisma/client'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

type PaymentLedgerDto = Omit<PaymentLedger, 'occurredAt'> & { occurredAt: string }

interface BookingSummary {
  id: string
  date: string
  status?: string
  paid?: boolean
  isPaid?: boolean
  totalCents?: number
  totalPrice?: number
  amount?: number
  name?: string
  customerName?: string
}

const toArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>
    if (Array.isArray(candidate.items)) return candidate.items as T[]
    if (Array.isArray(candidate.data)) return candidate.data as T[]
  }
  return []
}

const isBookingPaid = (booking: BookingSummary) => booking.paid === true || booking.isPaid === true || booking.status === 'PAID'

const getBookingAmountCents = (booking: BookingSummary) => {
  if (typeof booking.totalCents === 'number') return booking.totalCents
  if (typeof booking.amount === 'number') return booking.amount
  if (typeof booking.totalPrice === 'number') return Math.round(booking.totalPrice * 100)
  return 0
}

export default function ReconciliationPage(){
  const [anchor, setAnchor] = useState<string>(()=> new Date().toISOString().slice(0,7))
  const { data: ledger } = useSWR('/api/admin/ledger', fetcher)
  const { data: bookings } = useSWR('/api/bookings', fetcher)

  const ledgerEntries = toArray<PaymentLedgerDto>(ledger)
  const bookingSummaries = toArray<BookingSummary>(bookings)

  const [start, end] = (()=>{
    const [y,m] = anchor.split('-').map(Number)
    const s = new Date(Date.UTC(y, m-1, 1, 0,0,0))
    const e = new Date(Date.UTC(y, m, 0, 23,59,59))
    return [s,e]
  })()

  const ledgerByBooking: Record<string, PaymentLedgerDto[]> = {}
  for (const entry of ledgerEntries){
    const t = new Date(entry.occurredAt)
    if (t < start || t > end) continue
    const key = String(entry.bookingId||'')
    ledgerByBooking[key] = ledgerByBooking[key] || []
    ledgerByBooking[key].push(entry)
  }

  const paidBookings = bookingSummaries.filter((booking)=>{
    const t = new Date(booking.date)
    return t >= start && t <= end && isBookingPaid(booking)
  })

  const mismatches = paidBookings.filter((booking)=>{
    const k = String(booking.id)
    const entries = ledgerByBooking[k]||[]
    const hasPayment = entries.some(entry=> entry.eventType==='PAYMENT' || entry.eventType==='BOOKING_PAID')
    return !hasPayment
  })

  const orphanLedger = Object.entries(ledgerByBooking).filter(([bookingId, entries])=>{
    if (!bookingId) return true
    const hasPaymentEntry = entries.some(entry=> entry.eventType==='PAYMENT' || entry.eventType==='BOOKING_PAID')
    const hasMatchingBooking = bookingSummaries.some((booking)=> String(booking.id) === bookingId)
    return hasPaymentEntry && !hasMatchingBooking
  })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rapprochement</h1>
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm">Mois</label>
          <input type="month" className="border rounded px-2 py-1" value={anchor} onChange={e=> setAnchor(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Réservations payées sans écriture</div>
        <table className="w-full text-sm">
          <thead><tr><th className="p-2">Date</th><th className="p-2">Client</th><th className="p-2">Montant</th><th className="p-2">ID</th></tr></thead>
          <tbody>
            {mismatches.map((booking)=> (
              <tr key={booking.id} className="border-t">
                <td className="p-2">{format(new Date(booking.date),'dd/MM/yyyy')}</td>
                <td className="p-2">{booking.name || booking.customerName || '—'}</td>
                <td className="p-2">{(getBookingAmountCents(booking)/100).toFixed(2)}€</td>
                <td className="p-2">{booking.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Écritures orphelines (paiement sans réservation)</div>
        <table className="w-full text-sm">
          <thead><tr><th className="p-2">Date</th><th className="p-2">#Reçu</th><th className="p-2">Type</th><th className="p-2">Montant</th><th className="p-2">BookingId</th></tr></thead>
          <tbody>
            {orphanLedger.map(([, entries])=> entries.map((entry)=> (
              <tr key={entry.id} className="border-t">
                <td className="p-2">{format(new Date(entry.occurredAt),'dd/MM HH:mm')}</td>
                <td className="p-2">{entry.receiptNo ? `${new Date(entry.occurredAt).getUTCFullYear()}-${String(entry.receiptNo).padStart(6,'0')}` : '—'}</td>
                <td className="p-2">{entry.eventType}</td>
                <td className="p-2">{(entry.amount/100).toFixed(2)} {entry.currency}</td>
                <td className="p-2">{entry.bookingId || '—'}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
