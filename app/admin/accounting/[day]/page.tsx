"use client"
import useSWR from 'swr'
import { useMemo } from 'react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

export default function ClosureDetailPage({ params }: { params: { day: string } }){
  const dayParam = params.day // expected format yyyy-MM-dd
  const { data: closures } = useSWR('/api/admin/closures', fetcher)
  const { data: ledger } = useSWR('/api/admin/ledger', fetcher)

  const closure = useMemo(()=>{
    if (!Array.isArray(closures)) return null
    return closures.find((c:any)=> format(new Date(c.day), 'yyyy-MM-dd') === dayParam) || null
  }, [closures, dayParam])

  const entriesForDay = useMemo(()=>{
    if (!Array.isArray(ledger)) return []
    return ledger.filter((e:any)=> format(new Date(e.occurredAt), 'yyyy-MM-dd') === dayParam)
  }, [ledger, dayParam])

  if (!closure) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Clôture {dayParam}</h1>
        <p className="mt-2 text-sm">Aucune clôture enregistrée pour cette date.</p>
      </div>
    )
  }

  const snapshot = JSON.parse(closure.totalsJson)

  return (
    <div className="p-6 space-y-6">
      {/* Print header (appears only in print) */}
      <div className="print-only">
        <div style={{ textAlign:'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>Sweet Narcisse</div>
          <div style={{ fontSize: '12px' }}>10 RUE DE LA HERSE – 68000 COLMAR • Tél. 03 89 41 01 94</div>
          <div style={{ fontSize: '12px' }}>N° SIRET : 41191878200037</div>
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
            const snap = JSON.parse(closure.totalsJson)
            const rows: string[][] = []
            rows.push(['Date', format(new Date(closure.day),'yyyy-MM-dd')])
            rows.push(['Hash', closure.hash])
            rows.push(['Totaux', ...Object.entries(snap.totals).map(([k,v]: any)=> `${k}:${(Number(v)/100).toFixed(2)}€`)])
            rows.push(['Vouchers', ...Object.entries(snap.vouchers).map(([k,v]: any)=> `${k}:${Number(v)}`)])
            rows.push(['VAT', `Net:${(Number(snap.vat?.net||0)/100).toFixed(2)}€`, `VAT:${(Number(snap.vat?.vat||0)/100).toFixed(2)}€`, `Gross:${(Number(snap.vat?.gross||0)/100).toFixed(2)}€`])
            rows.push([])
            rows.push(['Heure','Reçu','Type','Provider','Méthode','Montant','Devise','Réservation'])
            for (const e of entriesForDay){
              rows.push([
                format(new Date(e.occurredAt),'HH:mm'),
                e.receiptNo ? `${new Date(e.occurredAt).getUTCFullYear()}-${String(e.receiptNo).padStart(6,'0')}` : '',
                e.eventType,
                e.provider,
                e.methodType || '',
                (e.amount/100).toFixed(2),
                e.currency,
                e.bookingId || ''
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
        <div className="mt-2 text-sm">Totaux: {Object.entries(snapshot.totals).map(([k,v]: any)=> `${k}: ${(Number(v)/100).toFixed(2)}€`).join(' • ')}</div>
        <div className="mt-1 text-sm">Vouchers: {Object.entries(snapshot.vouchers).map(([k,v]: any)=> `${k}: ${Number(v)}`).join(' • ') || '—'}</div>
        <div className="mt-1 text-sm">TVA: Net {(Number(snapshot.vat?.net||0)/100).toFixed(2)}€ • TVA {(Number(snapshot.vat?.vat||0)/100).toFixed(2)}€ • Brut {(Number(snapshot.vat?.gross||0)/100).toFixed(2)}€</div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Écritures du jour</div>
        <table className="w-full text-sm">
          <thead><tr><th className="p-2">Heure</th><th className="p-2">#Reçu</th><th className="p-2">Type</th><th className="p-2">Provider</th><th className="p-2">Méthode</th><th className="p-2">Montant</th><th className="p-2">Réservation</th></tr></thead>
          <tbody>
            {entriesForDay.map((e:any)=> (
              <tr key={e.id} className="border-t">
                <td className="p-2">{format(new Date(e.occurredAt),'HH:mm')}</td>
                <td className="p-2">{e.receiptNo ? `${new Date(e.occurredAt).getUTCFullYear()}-${String(e.receiptNo).padStart(6,'0')}` : '—'}</td>
                <td className="p-2">{e.eventType}</td>
                <td className="p-2">{e.provider}</td>
                <td className="p-2">{e.methodType || '—'}</td>
                <td className="p-2">{(e.amount/100).toFixed(2)} {e.currency}</td>
                <td className="p-2">{e.bookingId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
