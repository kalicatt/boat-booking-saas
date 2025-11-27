"use client"
import useSWR from 'swr'
import { useState } from 'react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

export default function ReconciliationPage(){
  const [anchor, setAnchor] = useState<string>(()=> new Date().toISOString().slice(0,7))
  const { data: ledger } = useSWR('/api/admin/ledger', fetcher)
  const { data: bookings } = useSWR('/api/bookings', fetcher)

  const [start, end] = (()=>{
    const [y,m] = anchor.split('-').map(Number)
    const s = new Date(Date.UTC(y, m-1, 1, 0,0,0))
    const e = new Date(Date.UTC(y, m, 0, 23,59,59))
    return [s,e]
  })()

  const ledgerByBooking: Record<string, any[]> = {}
  for (const e of (ledger||[])){
    const t = new Date(e.occurredAt)
    if (t < start || t > end) continue
    const key = String(e.bookingId||'')
    ledgerByBooking[key] = ledgerByBooking[key] || []
    ledgerByBooking[key].push(e)
  }

  const paidBookings = (bookings||[]).filter((b:any)=>{
    const t = new Date(b.date)
    return t >= start && t <= end && (b.status==='PAID' || b.paid===true)
  })

  const mismatches = paidBookings.filter((b:any)=>{
    const k = String(b.id)
    const entries = ledgerByBooking[k]||[]
    const hasPayment = entries.some(e=> e.eventType==='PAYMENT' || e.eventType==='BOOKING_PAID')
    return !hasPayment
  })

  const orphanLedger = Object.entries(ledgerByBooking).filter(([k,v])=>{
    if (!k) return true
    const entries = v as any[]
    return entries.some(e=> e.eventType==='PAYMENT' || e.eventType==='BOOKING_PAID') && !(bookings||[]).some((b:any)=> String(b.id)===k)
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
            {mismatches.map((b:any)=> (
              <tr key={b.id} className="border-t">
                <td className="p-2">{format(new Date(b.date),'dd/MM/yyyy')}</td>
                <td className="p-2">{b.name || b.customerName || '—'}</td>
                <td className="p-2">{((b.totalCents||b.amount||0)/100).toFixed(2)}€</td>
                <td className="p-2">{b.id}</td>
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
            {orphanLedger.map(([k, entries])=> (entries as any[]).map((e:any)=> (
              <tr key={e.id} className="border-t">
                <td className="p-2">{format(new Date(e.occurredAt),'dd/MM HH:mm')}</td>
                <td className="p-2">{e.receiptNo ? `${new Date(e.occurredAt).getUTCFullYear()}-${String(e.receiptNo).padStart(6,'0')}` : '—'}</td>
                <td className="p-2">{e.eventType}</td>
                <td className="p-2">{(e.amount/100).toFixed(2)} {e.currency}</td>
                <td className="p-2">{e.bookingId || '—'}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
