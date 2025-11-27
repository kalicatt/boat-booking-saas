"use client"
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

export default function ReservationsAdminPage(){
  const [range, setRange] = useState<'day'|'month'|'year'>('day')
  const [date, setDate] = useState(()=> new Date())
  const [q, setQ] = useState('')
  const [payment, setPayment] = useState('')
  const [groupChain, setGroupChain] = useState<number>(0)
  const [chainPreview, setChainPreview] = useState<Array<{ index: number, start: string, end: string, people: number }>>([])
  const startISO = useMemo(()=>{
    const d = new Date(date)
    if (range==='day') { d.setHours(0,0,0,0) }
    else if (range==='month') { d.setDate(1); d.setHours(0,0,0,0) }
    else { d.setMonth(0,1); d.setHours(0,0,0,0) }
    return d.toISOString()
  },[date,range])
  const endISO = useMemo(()=>{
    const d = new Date(date)
    if (range==='day') { d.setHours(23,59,59,999) }
    else if (range==='month') { const e = new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999); return e.toISOString() }
    else { const e = new Date(d.getFullYear(), 11, 31, 23,59,59,999); return e.toISOString() }
    return d.toISOString()
  },[date,range])
  const params = new URLSearchParams({ start: startISO, end: endISO })
  if (q) params.set('q', q)
  if (payment) params.set('payment', payment)
  const { data } = useSWR(`/api/admin/reservations?${params.toString()}`, fetcher)

  const bookings = Array.isArray(data)
    ? data : []
  const [selectedId, setSelectedId] = useState<string>('')
  const [inheritPaymentForChain, setInheritPaymentForChain] = useState(false)
  const [chainResult, setChainResult] = useState<{ created: number, overlaps: number, details?: Array<{ index: number, start: string, end: string, reason: string }>, createdAlloc?: Array<{ index: number, boatId: string, start: string, end: string, people: number }> }|null>(null)
  const [toasts, setToasts] = useState<Array<{ id: number, type: 'success'|'warning', message: string }>>([])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Liste des réservations</h1>
      <div className="mt-4 flex flex-wrap gap-3">
        <select value={range} onChange={e=>setRange(e.target.value as any)} className="border rounded px-2 py-1">
          <option value="day">Jour</option>
          <option value="month">Mois</option>
          <option value="year">Année</option>
        </select>
        <input type="date" value={format(date,'yyyy-MM-dd')} onChange={e=>setDate(new Date(e.target.value))} className="border rounded px-2 py-1" />
        <input placeholder="Nom ou Prénom" value={q} onChange={e=>setQ(e.target.value)} className="border rounded px-2 py-1" />
        <select value={payment} onChange={e=>setPayment(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Tous paiements</option>
          <option value="cash">Espèces</option>
          <option value="card">Carte</option>
          <option value="paypal">PayPal</option>
          <option value="applepay">Apple Pay</option>
          <option value="googlepay">Google Pay</option>
          <option value="voucher">ANCV/CityPass</option>
        </select>
        <input type="number" min={0} value={groupChain} onChange={e=>setGroupChain(parseInt(e.target.value || '0', 10))} placeholder="Chaîne (personnes)" className="border rounded px-2 py-1 w-44" />
        <button className="border rounded px-2 py-1" onClick={() => {
          const baseBooking: any = bookings.find((b:any)=>b.id===selectedId)
          const base = baseBooking ? new Date(baseBooking.startTime) : new Date(date)
          if (!baseBooking) base.setHours(9, 0, 0, 0)
          const capacity = 12
          const INTERVAL_MIN = 30
          const DURATION_MIN = 90
          const total = Math.max(0, groupChain)
          const chunks = Math.ceil(total / capacity)
          const preview: Array<{ index: number, start: string, end: string, people: number }> = []
          for (let i = 0; i < chunks; i++) {
            const s = new Date(base.getTime() + i * INTERVAL_MIN * 60000)
            const e = new Date(s.getTime() + DURATION_MIN * 60000)
            const ppl = Math.min(capacity, total - i * capacity)
            preview.push({ index: i + 1, start: format(s,'HH:mm'), end: format(e,'HH:mm'), people: ppl })
          }
          setChainPreview(preview)
        }}>Prévisualiser chaîne</button>
      </div>

      <div className="mt-6 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Date</th>
              <th className="p-2">Heure</th>
              <th className="p-2">Client</th>
              <th className="p-2">Pax</th>
              <th className="p-2">Langue</th>
              <th className="p-2">Paiement</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b:any)=>(
              <tr key={b.id} className={`border-b ${selectedId===b.id?'bg-yellow-50':''}`} onClick={()=>setSelectedId(b.id)}>
                <td className="p-2">{format(new Date(b.startTime),'dd/MM/yyyy')}</td>
                <td className="p-2">{format(new Date(b.startTime),'HH:mm')}</td>
                <td className="p-2">{b.user?.firstName} {b.user?.lastName}</td>
                <td className="p-2">{b.numberOfPeople}</td>
                <td className="p-2">{b.language}</td>
                <td className="p-2">{(b.payments?.[0]?.provider || '—')}{b.payments?.[0]?.methodType ? ` (${b.payments[0].methodType})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={inheritPaymentForChain} onChange={e=>setInheritPaymentForChain(e.target.checked)} />
          Hériter des métadonnées de paiement
        </label>
        <button
          className="border rounded px-3 py-1"
          disabled={!selectedId || groupChain<=0}
          onClick={async ()=>{
            const base = bookings.find((b:any)=>b.id===selectedId)
            if (!base) return
            const body = {
              date: format(new Date(base.startTime),'yyyy-MM-dd'),
              time: format(new Date(base.startTime),'HH:mm'),
              adults: base.numberOfPeople,
              children: 0,
              babies: 0,
              language: base.language || 'fr',
              userDetails: { firstName: base.user?.firstName || '', lastName: base.user?.lastName || '', email: base.user?.email || '' },
              isStaffOverride: true,
              groupChain,
              inheritPaymentForChain,
              paymentMethod: base.payments?.[0] ? { provider: base.payments[0].provider, methodType: base.payments[0].methodType } : undefined
            }
            const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const payload = await res.json()
            const createdCount = Array.isArray(payload.chainCreated) ? payload.chainCreated.length : 0
            const overlapCount = Array.isArray(payload.overlaps) ? payload.overlaps.length : 0
            setChainResult({ created: createdCount, overlaps: overlapCount, details: payload.overlaps || [], createdAlloc: payload.chainCreated || [] })
            const nextId = Date.now()
            if (createdCount>0) setToasts(t=>[...t, { id: nextId, type: 'success', message: `${createdCount} créneaux créés` }])
            if (overlapCount>0) setToasts(t=>[...t, { id: nextId+1, type: 'warning', message: `${overlapCount} créneaux ignorés (chevauchement)` }])
          }}
        >Créer chaîne à partir de la sélection</button>
      </div>

      {chainResult && (
        <div className="mt-2 text-sm">
          {chainResult.created>0 && <div className="text-green-700">{chainResult.created} créneaux créés</div>}
          {chainResult.overlaps>0 && <div className="text-orange-700">{chainResult.overlaps} créneaux ignorés pour chevauchement</div>}
          {chainResult.details && chainResult.details.length>0 && (
            <ul className="mt-2 list-disc ml-5 text-orange-800">
              {chainResult.details.map((o:any, idx:number)=>(
                <li key={idx}>#{o.index} {o.start} - {o.end}: {o.reason}</li>
              ))}
            </ul>
          )}
          {chainResult.createdAlloc && chainResult.createdAlloc.length>0 && (
            <div className="mt-3">
              <div className="font-semibold">Allocations créées</div>
              <ul className="list-disc ml-5 text-green-800">
                {chainResult.createdAlloc.map((c:any, idx:number)=>(
                  <li key={idx}>#{c.index} {c.start} - {c.end}: {c.people}p</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {toasts.length>0 && (
        <div className="fixed bottom-4 right-4 space-y-2">
          {toasts.map(t=> (
            <div key={t.id} className={`shadow rounded px-3 py-2 text-sm ${t.type==='success'?'bg-green-600 text-white':'bg-yellow-500 text-black'}`}>
              <div className="flex items-center gap-3">
                <span>{t.message}</span>
                <button className="opacity-80 hover:opacity-100" onClick={()=>setToasts(prev=>prev.filter(x=>x.id!==t.id))}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {chainPreview.length > 0 && (
        <div className="mt-4">
          <div className="font-semibold">Prévisualisation chaîne ({chainPreview.length} créneaux)</div>
          <ul className="list-disc ml-5">
            {chainPreview.map(c => (
              <li key={c.index}>#{c.index} {c.start} - {c.end} • {c.people}p</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
