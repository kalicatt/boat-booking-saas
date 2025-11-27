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
  const { data, mutate } = useSWR(`/api/admin/reservations?${params.toString()}`, fetcher)

  const bookings = Array.isArray(data)
    ? data : []
  const [selectedId, setSelectedId] = useState<string>('')
  const [inheritPaymentForChain, setInheritPaymentForChain] = useState(false)
  const [chainResult, setChainResult] = useState<{ created: number, overlaps: number, details?: Array<{ index: number, start: string, end: string, reason: string }>, createdAlloc?: Array<{ index: number, boatId: string, start: string, end: string, people: number }> }|null>(null)
  const [toasts, setToasts] = useState<Array<{ id: number, type: 'success'|'warning', message: string }>>([])

  const [showCreate, setShowCreate] = useState(false)
  const [createTab, setCreateTab] = useState<'normal'|'private'|'group'|'contact'>('normal')
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [contactStatus, setContactStatus] = useState<'NEW'|'CONTACTED'|'CLOSED'|''>('')
  const [showView, setShowView] = useState<any|null>(null)
  const [showEdit, setShowEdit] = useState<any|null>(null)
  const [form, setForm] = useState({
    date: format(new Date(),'yyyy-MM-dd'),
    time: '10:00',
    adults: 2,
    children: 0,
    babies: 0,
    language: 'fr',
    firstName: '',
    lastName: '',
    email: '',
    notes: ''
  })
  const [creating, setCreating] = useState(false)
  function EditForm({ booking, onClose, onSaved }: any){
    const [ed, setEd] = useState({
      date: format(new Date(booking.startTime),'yyyy-MM-dd'),
      time: format(new Date(booking.startTime),'HH:mm'),
      adults: booking.adults,
      children: booking.children,
      babies: booking.babies,
      language: booking.language
    })
    return (
      <div>
        <div className="space-y-3">
          <input className="border rounded px-2 py-1 w-full" value={ed.date} onChange={e=>setEd({...ed, date:e.target.value})} />
          <input className="border rounded px-2 py-1 w-full" value={ed.time} onChange={e=>setEd({...ed, time:e.target.value})} />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" className="border rounded px-2 py-1" value={ed.adults} onChange={e=>setEd({...ed, adults: parseInt(e.target.value||'0',10)})} />
            <input type="number" className="border rounded px-2 py-1" value={ed.children} onChange={e=>setEd({...ed, children: parseInt(e.target.value||'0',10)})} />
            <input type="number" className="border rounded px-2 py-1" value={ed.babies} onChange={e=>setEd({...ed, babies: parseInt(e.target.value||'0',10)})} />
          </div>
          <input className="border rounded px-2 py-1 w-full" value={ed.language} onChange={e=>setEd({...ed, language:e.target.value})} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="border rounded px-3 py-1" onClick={onClose}>Annuler</button>
          <button className="border rounded px-3 py-1 bg-blue-600 text-white" onClick={async ()=>{
            const payload:any = { adults: ed.adults, children: ed.children, babies: ed.babies, language: ed.language }
            // Changing date/time via PATCH: send ISO if provided
            if (ed.date && ed.time) { payload.date = ed.date; payload.time = ed.time }
            const resp = await fetch(`/api/bookings/${booking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (resp.ok) { onSaved() } else { onClose() }
          }}>Enregistrer</button>
        </div>
      </div>
    )
  }
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Tuile – Liste des réservations</h1>
      <div className="mt-2">
        <button className="border rounded px-3 py-1" onClick={()=>setShowCreate(true)}>Créer une réservation</button>
      </div>
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
              <th className="p-2">Actions</th>
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
                <td className="p-2">
                  <button className="border rounded px-2 py-1 mr-2" onClick={(e)=>{e.stopPropagation(); setShowView(b)}}>Voir</button>
                  <button className="border rounded px-2 py-1 mr-2" onClick={(e)=>{e.stopPropagation(); setShowEdit(b)}}>Modifier</button>
                  <button className="border rounded px-2 py-1" onClick={async (e)=>{ e.stopPropagation(); await fetch(`/api/bookings/${b.id}`, { method: 'DELETE' }); mutate(); }}>Supprimer</button>
                </td>
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
      {showView && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={()=>setShowView(null)}>
          <div className="bg-white rounded shadow p-4 w-full max-w-xl" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Détails réservation</div>
              <button onClick={()=>setShowView(null)}>✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <div>Date: {format(new Date(showView.startTime),'dd/MM/yyyy')} {format(new Date(showView.startTime),'HH:mm')}</div>
              <div>Client: {showView.user?.firstName} {showView.user?.lastName} ({showView.user?.email})</div>
              <div>Pax: {showView.numberOfPeople} (A {showView.adults} / E {showView.children} / B {showView.babies})</div>
              <div>Langue: {showView.language}</div>
              <div>Paiement: {(showView.payments?.[0]?.provider || '—')}{showView.payments?.[0]?.methodType ? ` (${showView.payments[0].methodType})` : ''}</div>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={()=>setShowEdit(null)}>
          <div className="bg-white rounded shadow p-4 w-full max-w-xl" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Modifier réservation</div>
              <button onClick={()=>setShowEdit(null)}>✕</button>
            </div>
            <div className="space-y-3">
              <input className="border rounded px-2 py-1 w-full" defaultValue={format(new Date(showEdit.startTime),'yyyy-MM-dd')} />
              <input className="border rounded px-2 py-1 w-full" defaultValue={format(new Date(showEdit.startTime),'HH:mm')} />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" className="border rounded px-2 py-1" defaultValue={showEdit.adults} />
                <input type="number" className="border rounded px-2 py-1" defaultValue={showEdit.children} />
                <input type="number" className="border rounded px-2 py-1" defaultValue={showEdit.babies} />
              </div>
              <input className="border rounded px-2 py-1 w-full" defaultValue={showEdit.language} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="border rounded px-3 py-1" onClick={()=>setShowEdit(null)}>Annuler</button>
              <button className="border rounded px-3 py-1 bg-blue-600 text-white" onClick={()=>{ /* TODO: wire PATCH */ setShowEdit(null); }}>Enregistrer</button>
            </div>
          </div>
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

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow p-4 w-full max-w-xl">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Créer une réservation</div>
              <button onClick={()=>setShowCreate(false)}>✕</button>
            </div>
            <div className="tabs mb-3">
              <button className={`tab tab-bordered ${createTab==='normal'?'tab-active':''}`} onClick={()=>setCreateTab('normal')}>Normale</button>
              <button className={`tab tab-bordered ${createTab==='private'?'tab-active':''}`} onClick={()=>setCreateTab('private')}>Privatisation</button>
              <button className={`tab tab-bordered ${createTab==='group'?'tab-active':''}`} onClick={()=>setCreateTab('group')}>Groupe</button>
              <button className={`tab tab-bordered ${createTab==='contact'?'tab-active':''}`} onClick={async()=>{ setCreateTab('contact'); const qs = contactStatus?`?status=${contactStatus}`:''; const r = await fetch(`/api/admin/contacts${qs}`); const c = await r.json(); setContacts(Array.isArray(c)?c:[]) }}>Depuis contact</button>
            </div>
            <div className="space-y-3">
              <input className="border rounded px-2 py-1 w-full" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} placeholder="Date (YYYY-MM-DD)" />
              <input className="border rounded px-2 py-1 w-full" value={form.time} onChange={e=>setForm({...form, time:e.target.value})} placeholder="Heure (HH:mm)" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" className="border rounded px-2 py-1" value={form.adults} onChange={e=>setForm({...form, adults: parseInt(e.target.value||'0',10)})} placeholder="Adultes" />
                <input type="number" className="border rounded px-2 py-1" value={form.children} onChange={e=>setForm({...form, children: parseInt(e.target.value||'0',10)})} placeholder="Enfants" />
                <input type="number" className="border rounded px-2 py-1" value={form.babies} onChange={e=>setForm({...form, babies: parseInt(e.target.value||'0',10)})} placeholder="Bébés" />
              </div>
              <input className="border rounded px-2 py-1 w-full" value={form.language} onChange={e=>setForm({...form, language:e.target.value})} placeholder="Langue (fr/en/de/...)" />
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded px-2 py-1" value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} placeholder="Prénom" />
                <input className="border rounded px-2 py-1" value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})} placeholder="Nom" />
              </div>
              <input className="border rounded px-2 py-1 w-full" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="Email" />
              {createTab==='contact' && (
                <div>
                  <div className="text-sm mb-2">Sélectionnez un contact à convertir</div>
                  <div className="flex gap-2 mb-2">
                    <select className="border rounded px-2 py-1" value={contactStatus} onChange={async e=>{ const v = e.target.value as any; setContactStatus(v); const qs = v?`?status=${v}`:''; const r = await fetch(`/api/admin/contacts${qs}`); const c = await r.json(); setContacts(Array.isArray(c)?c:[]) }}>
                      <option value="">Tous</option>
                      <option value="NEW">Nouveaux</option>
                      <option value="CONTACTED">Contactés</option>
                      <option value="CLOSED">Fermés</option>
                    </select>
                    <button className="border rounded px-2" onClick={async ()=>{ const qs = contactStatus?`?status=${contactStatus}`:''; const r = await fetch(`/api/admin/contacts${qs}`); const c = await r.json(); setContacts(Array.isArray(c)?c:[]) }}>Rafraîchir</button>
                  </div>
                  <select className="border rounded px-2 py-1 w-full" value={selectedContactId} onChange={e=>setSelectedContactId(e.target.value)}>
                    <option value="">— choisir —</option>
                    {contacts.map((c:any)=> (
                      <option key={c.id} value={c.id}>{c.kind} • {c.firstName} {c.lastName} • {c.people||''}p • {c.date||''}</option>
                    ))}
                  </select>
                </div>
              )}
              {createTab==='group' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="border rounded px-2 py-1" value={groupChain} onChange={e=>setGroupChain(parseInt(e.target.value||'0',10))} placeholder="Taille du groupe" />
                  <label className="flex items-center gap-2"><input type="checkbox" checked={inheritPaymentForChain} onChange={e=>setInheritPaymentForChain(e.target.checked)} /> Hériter paiement</label>
                </div>
              )}
              {createTab==='private' && (
                <div className="text-sm text-gray-600">Privatisation: le créneau sera fermé (capacité complète).</div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="border rounded px-3 py-1" onClick={()=>setShowCreate(false)}>Annuler</button>
              <button disabled={creating} className="border rounded px-3 py-1 bg-blue-600 text-white" onClick={async ()=>{
                setCreating(true)
                const basePayload:any = {
                  date: form.date,
                  time: form.time,
                  adults: form.adults,
                  children: form.children,
                  babies: form.babies,
                  language: form.language,
                  userDetails: { firstName: form.firstName, lastName: form.lastName, email: form.email },
                  isStaffOverride: true
                }
                let payload = basePayload
                if (createTab==='group') {
                  payload = { ...basePayload, groupChain, inheritPaymentForChain }
                }
                if (createTab==='private') {
                  // fill capacity via adults set; server will prevent overlap by capacity
                  payload = { ...basePayload, private: true }
                }
                if (createTab==='contact') {
                  const respC = await fetch('/api/admin/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId: selectedContactId }) })
                  const ok = respC.ok
                  setCreating(false)
                  if (ok) { setShowCreate(false); mutate(); setToasts(t=>[...t,{ id: Date.now(), type: 'success', message: 'Contact converti' }]) } else { setToasts(t=>[...t,{ id: Date.now(), type: 'warning', message: 'Échec conversion contact' }]) }
                  return
                }
                const resp = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                if (resp.ok) { setShowCreate(false); mutate(); setToasts(t=>[...t,{ id: Date.now(), type: 'success', message: 'Réservation créée' }]) }
                else { setToasts(t=>[...t,{ id: Date.now(), type: 'warning', message: 'Échec de création' }]) }
                setCreating(false)
              }}>Créer</button>
                  {showEdit && (
                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={()=>setShowEdit(null)}>
                      <div className="bg-white rounded shadow p-4 w-full max-w-xl" onClick={e=>e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                          <div className="font-semibold">Modifier réservation</div>
                          <button onClick={()=>setShowEdit(null)}>✕</button>
                        </div>
                        <EditForm booking={showEdit} onClose={()=>setShowEdit(null)} onSaved={()=>{ setShowEdit(null); mutate(); }} />
                      </div>
                    </div>
                  )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
