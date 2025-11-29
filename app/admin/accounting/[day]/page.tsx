"use client"
import useSWR from 'swr'
import { useMemo } from 'react'
import { format } from 'date-fns'
import type { DailyClosure, PaymentLedger } from '@prisma/client'
import { business } from '@/lib/business'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

type PaymentLedgerDto = Omit<PaymentLedger, 'occurredAt'> & { occurredAt: string }
type DailyClosureDto = Omit<DailyClosure, 'day' | 'closedAt'> & { day: string; closedAt: string | null }

type ClosureSnapshot = {
  totals: Record<string, number>
  vouchers: Record<string, number>
  vat?: { net?: number; vat?: number; gross?: number }
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

const parseClosureSnapshot = (payload: unknown): ClosureSnapshot | null => {
  if (typeof payload !== 'string') return null
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return null
    const totals = Object.entries(parsed.totals ?? {}).reduce<Record<string, number>>((acc, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) acc[key] = value
      return acc
    }, {})
    const vouchers = Object.entries(parsed.vouchers ?? {}).reduce<Record<string, number>>((acc, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) acc[key] = value
      return acc
    }, {})
    const snapshot: ClosureSnapshot = { totals, vouchers }
    if (parsed.vat && typeof parsed.vat === 'object' && parsed.vat !== null) {
      const vat = parsed.vat as Record<string, unknown>
      snapshot.vat = {
        net: typeof vat.net === 'number' ? vat.net : undefined,
        vat: typeof vat.vat === 'number' ? vat.vat : undefined,
        gross: typeof vat.gross === 'number' ? vat.gross : undefined
      }
    }
    return snapshot
  } catch {
    return null
  }
}

export default function ClosureDetailPage({ params }: { params: { day: string } }){
  const dayParam = params.day // expected format yyyy-MM-dd
  const { data: closures } = useSWR('/api/admin/closures', fetcher)
  const { data: ledger } = useSWR('/api/admin/ledger', fetcher)

  const closuresList = toArray<DailyClosureDto>(closures)
  const ledgerEntries = toArray<PaymentLedgerDto>(ledger)

  const closure = useMemo(()=>{
    return closuresList.find((item)=> format(new Date(item.day), 'yyyy-MM-dd') === dayParam) || null
  }, [closuresList, dayParam])

  const entriesForDay = useMemo(()=>{
    return ledgerEntries.filter((entry)=> format(new Date(entry.occurredAt), 'yyyy-MM-dd') === dayParam)
  }, [ledgerEntries, dayParam])

  if (!closure) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Clôture {dayParam}</h1>
        <p className="mt-2 text-sm">Aucune clôture enregistrée pour cette date.</p>
      </div>
    )
  }

  const snapshot = parseClosureSnapshot(closure.totalsJson) ?? { totals: {}, vouchers: {} }

  return (
    <div className="p-6 space-y-6">
      {/* Print header (appears only in print) */}
      <div className="print-only">
        <div style={{ textAlign:'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{business.name}</div>
          <div style={{ fontSize: '12px' }}>{business.address} • Tél. {business.phone}</div>
          <div style={{ fontSize: '12px' }}>N° SIRET : {business.siret}</div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'8px' }}>
          <div>Date: {format(new Date(closure.day),'dd/MM/yyyy')}</div>
          <div>Hash: {closure.hash.slice(0,12)}…</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clôture du {format(new Date(closure.day),'dd/MM/yyyy')}</h1>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-1 no-print" onClick={()=> window.print()}>Imprimer</button>
          <button className="border rounded px-3 py-1 no-print" onClick={()=>{
            const snap = parseClosureSnapshot(closure.totalsJson) ?? { totals: {}, vouchers: {}, vat: undefined }
            const rows: string[][] = []
            rows.push(['Entreprise', business.name])
            rows.push(['Adresse', business.address])
            rows.push(['Téléphone', business.phone])
            rows.push(['SIRET', business.siret])
            rows.push([])
            rows.push(['Date', format(new Date(closure.day),'yyyy-MM-dd')])
            rows.push(['Hash', closure.hash])
            rows.push(['Totaux', ...Object.entries(snap.totals).map(([key,value])=> `${key}:${(value/100).toFixed(2)}€`)] )
            rows.push(['Vouchers', ...Object.entries(snap.vouchers).map(([key,value])=> `${key}:${value}`)])
            rows.push(['TVA', `Net:${((snap.vat?.net ?? 0)/100).toFixed(2)}€`, `TVA:${((snap.vat?.vat ?? 0)/100).toFixed(2)}€`, `Brut:${((snap.vat?.gross ?? 0)/100).toFixed(2)}€`])
            rows.push([])
            rows.push(['Heure','Reçu','Type','Provider','Méthode','Montant','Devise','Réservation'])
            for (const entry of entriesForDay){
              rows.push([
                format(new Date(entry.occurredAt),'HH:mm'),
                entry.receiptNo ? `${new Date(entry.occurredAt).getUTCFullYear()}-${String(entry.receiptNo).padStart(6,'0')}` : '',
                entry.eventType,
                entry.provider,
                entry.methodType || '',
                (entry.amount/100).toFixed(2),
                entry.currency,
                entry.bookingId || ''
              ])
            }
            const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `closure_${dayParam}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a)
            setTimeout(()=> URL.revokeObjectURL(url), 2000)
          }}>Exporter CSV</button>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Résumé</div>
        <div className="text-sm">Hash: <span className="font-mono">{closure.hash}</span></div>
        <div className="mt-2 text-sm">Totaux: {Object.entries(snapshot.totals).map(([key,value])=> `${key}: ${(value/100).toFixed(2)}€`).join(' • ')}</div>
        <div className="mt-1 text-sm">Vouchers: {Object.entries(snapshot.vouchers).map(([key,value])=> `${key}: ${value}`).join(' • ') || '—'}</div>
        <div className="mt-1 text-sm">TVA: Net {((snapshot.vat?.net ?? 0)/100).toFixed(2)}€ • TVA {((snapshot.vat?.vat ?? 0)/100).toFixed(2)}€ • Brut {((snapshot.vat?.gross ?? 0)/100).toFixed(2)}€</div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Écritures du jour</div>
        <table className="w-full text-sm">
          <thead><tr><th className="p-2">Heure</th><th className="p-2">#Reçu</th><th className="p-2">Type</th><th className="p-2">Provider</th><th className="p-2">Méthode</th><th className="p-2">Montant</th><th className="p-2">Réservation</th></tr></thead>
          <tbody>
            {entriesForDay.map((entry)=> (
              <tr key={entry.id} className="border-t">
                <td className="p-2">{format(new Date(entry.occurredAt),'HH:mm')}</td>
                <td className="p-2">{entry.receiptNo ? `${new Date(entry.occurredAt).getUTCFullYear()}-${String(entry.receiptNo).padStart(6,'0')}` : '—'}</td>
                <td className="p-2">{entry.eventType}</td>
                <td className="p-2">{entry.provider}</td>
                <td className="p-2">{entry.methodType || '—'}</td>
                <td className="p-2">{(entry.amount/100).toFixed(2)} {entry.currency}</td>
                <td className="p-2">{entry.bookingId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
