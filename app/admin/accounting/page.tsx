"use client"
import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { business } from '@/lib/business'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

export default function AccountingAdminPage(){
  const { data: ledger, mutate: mutateLedger } = useSWR('/api/admin/ledger', fetcher)
  const { data: cash, mutate: mutateCash } = useSWR('/api/admin/cash', fetcher)
  const { data: closures, mutate: mutateClosures } = useSWR('/api/admin/closures', fetcher)
    const toArray = (x:any) => Array.isArray(x) ? x : (Array.isArray(x?.items) ? x.items : (Array.isArray(x?.closures) ? x.closures : (Array.isArray(x?.data) ? x.data : [])))
    const ledgerList = toArray(ledger)
    const cashList = toArray(cash)
    const closuresList = toArray(closures)
    const isForbidden = (x:any) => !!x && !Array.isArray(x) && (x.status===403 || x.code===403 || x?.error==='Forbidden')
  const [openingFloatEuros, setOpeningFloatEuros] = useState('')
  const [closingCountEuros, setClosingCountEuros] = useState('')
  const [csvUrl, setCsvUrl] = useState<string|undefined>(undefined)
  const [selectedDay, setSelectedDay] = useState<string>(()=> new Date().toISOString().slice(0,10))
  const [toast, setToast] = useState<{type:'success'|'error', message:string}|null>(null)
  const [exportPeriod, setExportPeriod] = useState<'week'|'month'>('month')
  const [exportAnchor, setExportAnchor] = useState<string>(()=> new Date().toISOString().slice(0,7))
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
              {cashList.map((s:any)=> {
                              const latest = Array.isArray(cashList) ? cashList[0] : null
                const expected = s.movements?.reduce((sum:number,m:any)=> sum + (m.amount||0), s.openingFloat||0) || (s.openingFloat||0)
                const variance = typeof s.closingCount === 'number' ? (s.closingCount - expected) : null
                return (
                  <li key={s.id} className="flex justify-between">
                    <span>Ouverte: {format(new Date(s.openedAt),'dd/MM HH:mm')} • Float: {(s.openingFloat/100).toFixed(2)}€</span>
                    <span>
                      Fermée: {s.closedAt ? format(new Date(s.closedAt),'dd/MM HH:mm') : '—'} • Comptage: {typeof s.closingCount==='number' ? (s.closingCount/100).toFixed(2)+'€' : '—'}
                      {variance!==null && (
                        <span className={Math.abs(variance)>0 ? 'ml-2 text-red-600' : 'ml-2 text-green-600'}>Écart: {(variance/100).toFixed(2)}€</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 lg:col-span-2">
          <div className="font-semibold mb-2">Ledger (dernier 200)</div>
          <div className="mb-2 text-sm">
            <a href="/admin/accounting/reconciliation" className="underline text-blue-600">Aller au rapprochement</a>
          </div>
          <table className="w-full text-sm">
            <thead><tr><th className="p-2">Date</th><th className="p-2">#Reçu</th><th className="p-2">Type</th><th className="p-2">Provider</th><th className="p-2">Method</th><th className="p-2">Montant</th><th className="p-2">Booking</th></tr></thead>
            <tbody>
          {isForbidden(ledger) && (
            <div className="mb-2 text-sm text-red-600">Accès refusé (403). Veuillez vous authentifier en tant qu'admin.</div>
          )}
              {ledgerList.map((e:any)=> (
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
          if (!Array.isArray(closuresList) || closuresList.length===0) return
          const c = closuresList.find((x:any)=> new Date(x.day).toISOString().slice(0,10)===selectedDay) || closuresList[0]
          const snap = JSON.parse(c.totalsJson)
          const rows = [
            ['Entreprise', business.name],
            ['Adresse', business.address],
            ['Téléphone', business.phone],
            ['SIRET', business.siret],
            [],
            ['Date', format(new Date(c.day),'yyyy-MM-dd')],
            ['Hash', c.hash],
            ['Totaux', ...Object.entries(snap.totals).map(([k,v]: any)=> `${k}:${(Number(v)/100).toFixed(2)}€`)],
            ['Vouchers', ...Object.entries(snap.vouchers).map(([k,v]: any)=> `${k}:${Number(v)}`)],
            ['TVA', `Net:${(Number(snap.vat?.net||0)/100).toFixed(2)}€`, `TVA:${(Number(snap.vat?.vat||0)/100).toFixed(2)}€`, `Brut:${(Number(snap.vat?.gross||0)/100).toFixed(2)}€`]
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
            {closuresList.map((c:any)=>{
              const snapshot = JSON.parse(c.totalsJson)
              return (
                <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={()=>{
                  const dayStr = format(new Date(c.day), 'yyyy-MM-dd')
                  window.location.href = `/admin/accounting/${dayStr}`
                }}>
                  <td className="p-2">{format(new Date(c.day),'dd/MM/yyyy')}</td>
                  <td className="p-2">{c.hash.slice(0,12)}…</td>
                  <td className="p-2">{Object.entries(snapshot.totals).map(([k,v])=> `${k}: ${(Number(v)/100).toFixed(2)}€`).join(' • ')} | Vouchers: {Object.entries(snapshot.vouchers).map(([k,v])=> `${k}: ${Number(v)}`).join(' • ')} | TVA: Net {(Number(snapshot.vat?.net||0)/100).toFixed(2)}€ • TVA {(Number(snapshot.vat?.vat||0)/100).toFixed(2)}€ • Brut {(Number(snapshot.vat?.gross||0)/100).toFixed(2)}€</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Exports Hebdo/Mensuel</div>
        <div className="flex items-center gap-2">
          <select className="border rounded px-2 py-1" value={exportPeriod} onChange={e=> setExportPeriod(e.target.value as 'week'|'month')}>
            <option value="week">Hebdomadaire</option>
            <option value="month">Mensuel</option>
          </select>
          {exportPeriod==='month' ? (
            <input type="month" className="border rounded px-2 py-1" value={exportAnchor} onChange={e=> setExportAnchor(e.target.value)} />
          ) : (
            <input type="date" className="border rounded px-2 py-1" value={exportAnchor.length===10?exportAnchor: new Date().toISOString().slice(0,10)} onChange={e=> setExportAnchor(e.target.value)} />
          )}
          <button className="border rounded px-3 py-1" onClick={()=>{
            if (!Array.isArray(ledger) || ledger.length===0) return
            // Compute start/end
            let start: Date, end: Date
            if (exportPeriod==='month'){
              const [y,m] = exportAnchor.split('-').map(Number)
              start = new Date(Date.UTC(y, m-1, 1, 0,0,0))
              end = new Date(Date.UTC(y, m, 0, 23,59,59))
            } else {
              const d = new Date(exportAnchor+'T00:00:00Z')
              const dow = d.getUTCDay() // 0=Sun
              const diffToMonday = (dow===0? -6 : 1 - dow)
              start = new Date(d); start.setUTCDate(d.getUTCDate()+diffToMonday); start.setUTCHours(0,0,0,0)
              end = new Date(start); end.setUTCDate(start.getUTCDate()+6); end.setUTCHours(23,59,59,999)
            }
            const entries = ledger.filter((e:any)=>{
              const t = new Date(e.occurredAt)
              return t >= start && t <= end
            })
            const totalCents = entries.reduce((sum:number,e:any)=> sum + (e.amount||0), 0)
            const byMethod: Record<string, number> = {}
            const byType: Record<string, number> = {}
            const counts: Record<string, number> = {}
            for (const e of entries){
              const m = e.methodType || '—'
              byMethod[m] = (byMethod[m]||0) + (e.amount||0)
              byType[e.eventType] = (byType[e.eventType]||0) + (e.amount||0)
              counts[e.eventType] = (counts[e.eventType]||0) + 1
            }
            const periodLabel = exportPeriod==='month' ? exportAnchor : `${format(start,'yyyy-MM-dd')} à ${format(end,'yyyy-MM-dd')}`
            const rows: any[] = [
              ['Entreprise', business.name],
              ['Adresse', business.address],
              ['Téléphone', business.phone],
              ['SIRET', business.siret],
              [],
              ['Période', periodLabel],
              ['Total brut', (totalCents/100).toFixed(2)+'€'],
              ['Par méthode', ...Object.entries(byMethod).map(([k,v])=> `${k}:${(v/100).toFixed(2)}€`)],
              ['Par type', ...Object.entries(byType).map(([k,v])=> `${k}:${(v/100).toFixed(2)}€`)],
              ['Comptes', ...Object.entries(counts).map(([k,v])=> `${k}:${v}`)],
              [],
              ['Détails'],
              ['Date','Reçu','Type','Provider','Méthode','Montant','Devise','Booking']
            ]
            for (const e of entries){
              rows.push([
                format(new Date(e.occurredAt),'yyyy-MM-dd HH:mm'),
                e.receiptNo ? `${new Date(e.occurredAt).getUTCFullYear()}-${String(e.receiptNo).padStart(6,'0')}` : '—',
                e.eventType,
                e.provider,
                e.methodType || '—',
                (e.amount/100).toFixed(2),
                e.currency,
                e.bookingId || '—'
              ])
            }
            const csv = rows.map((r:any)=> r.map((v:any)=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            setCsvUrl(url)
            const name = exportPeriod==='month' ? `export_${exportAnchor}.csv` : `export_${format(start,'yyyy-MM-dd')}_${format(end,'yyyy-MM-dd')}.csv`
            const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a)
            setTimeout(()=>{ URL.revokeObjectURL(url); setCsvUrl(undefined) }, 2000)
          }}>Exporter CSV</button>
        </div>
      </div>
    </div>
  )
}
