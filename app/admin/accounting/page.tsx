"use client"
import useSWR from 'swr'
import { useState } from 'react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

export default function AccountingAdminPage(){
  const { data: ledger } = useSWR('/api/admin/ledger', fetcher)
  const { data: cash } = useSWR('/api/admin/cash', fetcher)
  const { data: closures, mutate: mutateClosures } = useSWR('/api/admin/closures', fetcher)
  const [openingFloat, setOpeningFloat] = useState(0)
  const [closingCount, setClosingCount] = useState(0)
  const [csvUrl, setCsvUrl] = useState<string|undefined>(undefined)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Comptabilité</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold mb-2">Caisse</div>
          <div className="space-y-2">
            <input type="number" className="border rounded px-2 py-1" value={openingFloat} onChange={e=>setOpeningFloat(parseInt(e.target.value||'0',10))} placeholder="Fond de caisse (cents)" />
            <button className="border rounded px-3 py-1" onClick={async ()=>{
              await fetch('/api/admin/cash', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'open', openingFloat }) })
            }}>Ouvrir Caisse</button>
            <input type="number" className="border rounded px-2 py-1" value={closingCount} onChange={e=>setClosingCount(parseInt(e.target.value||'0',10))} placeholder="Comptage (cents)" />
            <button className="border rounded px-3 py-1" onClick={async ()=>{
              const latest = Array.isArray(cash) ? cash[0] : null
              if (!latest) return
              await fetch('/api/admin/cash', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'close', sessionId: latest.id, closingCount }) })
            }}>Clore Caisse</button>
          </div>
          <div className="mt-3 text-sm">
            <div className="font-semibold">Sessions</div>
            <ul className="mt-2 space-y-1">
              {(cash||[]).map((s:any)=> (
                <li key={s.id} className="flex justify-between">
                  <span>Ouverte: {format(new Date(s.openedAt),'dd/MM HH:mm')} • Float: {s.openingFloat}</span>
                  <span>Fermée: {s.closedAt ? format(new Date(s.closedAt),'dd/MM HH:mm') : '—'} • Comptage: {s.closingCount ?? '—'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 lg:col-span-2">
          <div className="font-semibold mb-2">Ledger (dernier 200)</div>
          <table className="w-full text-sm">
            <thead><tr><th className="p-2">Date</th><th className="p-2">#Reçu</th><th className="p-2">Type</th><th className="p-2">Provider</th><th className="p-2">Method</th><th className="p-2">Montant</th><th className="p-2">Booking</th></tr></thead>
            <tbody>
              {(ledger||[]).map((e:any)=> (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{format(new Date(e.occurredAt),'dd/MM HH:mm')}</td>
                  <td className="p-2">{e.receiptNo ?? '—'}</td>
                  <td className="p-2">{e.eventType}</td>
                  <td className="p-2">{e.provider}</td>
                  <td className="p-2">{e.methodType || '—'}</td>
                  <td className="p-2">{(e.amount/100).toFixed(2)} {e.currency}</td>
                  <td className="p-2">{e.bookingId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Clôture journalière (Z)</div>
        <button className="border rounded px-3 py-1" onClick={async ()=>{
          const day = new Date(); day.setHours(0,0,0,0)
          await fetch('/api/admin/closures', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ day }) })
          mutateClosures()
        }}>Clôturer aujourd'hui</button>
        <button className="ml-2 border rounded px-3 py-1" onClick={()=>{
          if (!Array.isArray(closures) || closures.length===0) return
          const c = closures[0]
          const snap = JSON.parse(c.totalsJson)
          const rows = [
            ['Date', format(new Date(c.day),'yyyy-MM-dd')],
            ['Hash', c.hash],
            ['Totaux', ...Object.entries(snap.totals).map(([k,v]: any)=> `${k}:${(Number(v)/100).toFixed(2)}€`)],
            ['Vouchers', ...Object.entries(snap.vouchers).map(([k,v]: any)=> `${k}:${Number(v)}`)],
            ['VAT', `Net:${(Number(snap.vat?.net||0)/100).toFixed(2)}€`, `VAT:${(Number(snap.vat?.vat||0)/100).toFixed(2)}€`, `Gross:${(Number(snap.vat?.gross||0)/100).toFixed(2)}€`]
          ]
          const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          setCsvUrl(url)
          const a = document.createElement('a'); a.href = url; a.download = `closure_${format(new Date(c.day),'yyyy-MM-dd')}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a)
          setTimeout(()=>{ URL.revokeObjectURL(url); setCsvUrl(undefined) }, 2000)
        }}>Exporter CSV</button>
        <button className="ml-2 border rounded px-3 py-1" onClick={()=> window.print()}>Exporter PDF (imprimer)</button>
        <table className="w-full text-sm mt-3">
          <thead><tr><th className="p-2">Date</th><th className="p-2">Hash</th><th className="p-2">Totaux</th></tr></thead>
          <tbody>
            {(closures||[]).map((c:any)=>{
              const snapshot = JSON.parse(c.totalsJson)
              return (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{format(new Date(c.day),'dd/MM/yyyy')}</td>
                  <td className="p-2">{c.hash.slice(0,12)}…</td>
                  <td className="p-2">{Object.entries(snapshot.totals).map(([k,v])=> `${k}: ${(Number(v)/100).toFixed(2)}€`).join(' • ')} | Vouchers: {Object.entries(snapshot.vouchers).map(([k,v])=> `${k}: ${Number(v)}`).join(' • ')} | TVA: Net {(Number(snapshot.vat?.net||0)/100).toFixed(2)}€ • TVA {(Number(snapshot.vat?.vat||0)/100).toFixed(2)}€ • Brut {(Number(snapshot.vat?.gross||0)/100).toFixed(2)}€</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
