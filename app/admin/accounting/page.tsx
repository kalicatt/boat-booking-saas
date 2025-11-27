"use client"
import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

export default function AccountingAdminPage(){
  const { data: ledger, mutate: mutateLedger } = useSWR('/api/admin/ledger', fetcher)
  const { data: cash, mutate: mutateCash } = useSWR('/api/admin/cash', fetcher)
  const { data: closures, mutate: mutateClosures } = useSWR('/api/admin/closures', fetcher)
  const [openingFloatEuros, setOpeningFloatEuros] = useState('')
  const [closingCountEuros, setClosingCountEuros] = useState('')
  const [csvUrl, setCsvUrl] = useState<string|undefined>(undefined)
  const [selectedDay, setSelectedDay] = useState<string>(()=> new Date().toISOString().slice(0,10))
  const [toast, setToast] = useState<{type:'success'|'error', message:string}|null>(null)
  useEffect(()=>{
    if (!toast) return
    const t = setTimeout(()=> setToast(null), 2500)
    return ()=> clearTimeout(t)
  }, [toast])

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded px-4 py-2 shadow ${toast.type==='success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      <h1 className="text-2xl font-bold">Comptabilité</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold mb-2">Caisse</div>
          <div className="space-y-2">
            <label className="block text-sm text-gray-600">Fond de caisse (en euros, ex: 150.00)</label>
            <input type="number" step="0.01" min="0" className="border rounded px-2 py-1" value={openingFloatEuros} onChange={e=>setOpeningFloatEuros(e.target.value)} placeholder="Saisir le fond de caisse en €" />
            <button className="border rounded px-3 py-1" onClick={async ()=>{
              if (!window.confirm('Confirmer l\'ouverture de la caisse ?')) return
              try {
                const cents = Math.round(parseFloat(openingFloatEuros || '0') * 100)
                const res = await fetch('/api/admin/cash', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'open', openingFloat: isNaN(cents) ? 0 : cents }) })
                if (!res.ok) throw new Error('Open cash failed')
                await mutateCash()
                await mutateLedger()
                setToast({ type:'success', message:'Caisse ouverte avec succès' })
              } catch (e) {
                setToast({ type:'error', message:'Erreur lors de l\'ouverture de la caisse' })
              }
            }}>Ouvrir Caisse</button>
            <label className="block text-sm text-gray-600">Comptage (en euros, ex: 198.50)</label>
            <input type="number" step="0.01" min="0" className="border rounded px-2 py-1" value={closingCountEuros} onChange={e=>setClosingCountEuros(e.target.value)} placeholder="Saisir le comptage en €" />
            <button className="border rounded px-3 py-1" onClick={async ()=>{
              if (!window.confirm('Confirmer la clôture de la caisse ?')) return
              const latest = Array.isArray(cash) ? cash[0] : null
              if (!latest) { setToast({ type:'error', message:'Aucune session de caisse ouverte' }); return }
              try {
                const cents = Math.round(parseFloat(closingCountEuros || '0') * 100)
                const res = await fetch('/api/admin/cash', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'close', sessionId: latest.id, closingCount: isNaN(cents) ? 0 : cents }) })
                if (!res.ok) throw new Error('Close cash failed')
                await mutateCash()
                await mutateLedger()
                setToast({ type:'success', message:'Caisse clôturée avec succès' })
              } catch (e) {
                setToast({ type:'error', message:'Erreur lors de la clôture de la caisse' })
              }
            }}>Clore Caisse</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">La caisse ne concerne que les espèces. Les paiements CB et en ligne sont visibles dans le ledger mais n'affectent pas le comptage de caisse.</p>
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
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Clôture journalière (Z)</div>
        <div className="flex items-center gap-2">
        <input type="date" className="border rounded px-2 py-1" value={selectedDay} onChange={e=> setSelectedDay(e.target.value)} />
        <button className="border rounded px-3 py-1" onClick={async ()=>{
          if (!window.confirm(`Clôturer la journée du ${selectedDay} ?`)) return
          try {
            const d = new Date(selectedDay+'T00:00:00Z'); const day = d; day.setUTCHours(0,0,0,0)
            const res = await fetch('/api/admin/closures', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ day }) })
            if (!res.ok) throw new Error('Closure failed')
            await mutateClosures()
            await mutateLedger()
            setToast({ type:'success', message:'Clôture journalière enregistrée et sauvegardée en base' })
          } catch (e) {
            setToast({ type:'error', message:'Erreur lors de la clôture journalière' })
          }
        }}>Clôturer la journée</button>
        <button className="ml-2 border rounded px-3 py-1" onClick={()=>{
          if (!Array.isArray(closures) || closures.length===0) return
          const c = closures.find((x:any)=> new Date(x.day).toISOString().slice(0,10)===selectedDay) || closures[0]
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
        </div>
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
