"use client"
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

export default function ReservationsAdminPage(){
  const [range, setRange] = useState<'day'|'month'|'year'>('day')
  const [date, setDate] = useState(()=> new Date())
  const [monthStr, setMonthStr] = useState<string>(()=> format(new Date(),'yyyy-MM'))
  const [yearStr, setYearStr] = useState<string>(()=> String(new Date().getFullYear()))
  const [q, setQ] = useState('')
  const [payment, setPayment] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createTab, setCreateTab] = useState<'normal'|'private'|'group'|'contact'>('normal')
  const [creating, setCreating] = useState(false)
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
    company: '',
    phone: '',
    address: '',
    eventDate: '',
    eventTime: '',
    budget: '',
    reason: '',
    message: ''
  })
  const [selectedId, setSelectedId] = useState<string>('')
  const [groupChain, setGroupChain] = useState<number>(0)
  const [chainPreview, setChainPreview] = useState<Array<{ index: number, start: string, end: string, people: number }>>([])
  const [inheritPaymentForChain, setInheritPaymentForChain] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: number, type: 'success'|'warning', message: string }>>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [contactStatus, setContactStatus] = useState<'NEW'|'CONTACTED'|'CLOSED'|''>('')
  const [showView, setShowView] = useState<any|null>(null)
  const [showEdit, setShowEdit] = useState<any|null>(null)
  const [chainCreating, setChainCreating] = useState(false)
  const [contactConverting, setContactConverting] = useState(false)
  const [chainBaseTime, setChainBaseTime] = useState('09:00')
  const [markPaid, setMarkPaid] = useState<{ id: string, provider: string, methodType?: string }|null>(null)
  const [viewMarkPaid, setViewMarkPaid] = useState<{ provider: string, methodType?: string }|null>(null)

  const startISO = useMemo(()=>{
    if (range==='day') {
      const d = new Date(date); d.setHours(0,0,0,0); return d.toISOString()
    }
    if (range==='month') {
      const [y,m] = monthStr.split('-').map(n=>parseInt(n,10))
      const d = new Date(y, (m-1), 1, 0,0,0,0); return d.toISOString()
    }
    const y = parseInt(yearStr,10)
    const d = new Date(y, 0, 1, 0,0,0,0); return d.toISOString()
  },[date,range,monthStr,yearStr])

  const endISO = useMemo(()=>{
    if (range==='day') { const d = new Date(date); d.setHours(23,59,59,999); return d.toISOString() }
    if (range==='month') {
      const [y,m] = monthStr.split('-').map(n=>parseInt(n,10))
      const e = new Date(y, m, 0, 23,59,59,999); return e.toISOString()
    }
    const y = parseInt(yearStr,10)
    const e = new Date(y, 11, 31, 23,59,59,999); return e.toISOString()
  },[date,range,monthStr,yearStr])

  const params = new URLSearchParams({ start: startISO, end: endISO })
  if (q) params.set('q', q)
  if (payment) params.set('payment', payment)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/reservations?${params.toString()}`, fetcher)

  const bookings = Array.isArray(data) ? data : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tuile – Liste des réservations</h1>
        <button className="border rounded px-3 py-2 bg-blue-600 text-white hover:bg-blue-700" onClick={()=>setShowCreate(true)}>+ Créer</button>
      </div>
      <div className="text-xs text-slate-600">
        Astuces:
        <span className="ml-1">• Cliquez une ligne pour la sélectionner (base horaire de chaîne).</span>
        <span className="ml-2">• L’option « Hériter des métadonnées de paiement » copie uniquement le fournisseur et le type; les paiements restent en attente.</span>
        <span className="ml-2">• Utilisez « Privatisation » pour fermer entièrement la capacité d’un créneau.</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-3 items-end">
        <select value={range} onChange={e=>setRange(e.target.value as any)} className="border rounded px-2 py-1">
          <option value="day">Jour</option>
          <option value="month">Mois</option>
          <option value="year">Année</option>
        </select>
        {range==='day' && (
          <input type="date" value={format(date,'yyyy-MM-dd')} onChange={e=>setDate(new Date(e.target.value))} className="border rounded px-2 py-1" />
        )}
        {range==='month' && (
          <input type="month" value={monthStr} onChange={e=>setMonthStr(e.target.value)} className="border rounded px-2 py-1" />
        )}
        {range==='year' && (
          <input type="number" min={2000} max={2100} value={yearStr} onChange={e=>setYearStr(e.target.value)} className="border rounded px-2 py-1 w-24" />
        )}
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
        <div className="text-[11px] text-slate-500">Filtrez par période, nom ou méthode de paiement.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 overflow-auto rounded-xl border border-slate-200 bg-white">
          {isLoading && (
            <div className="p-4 text-sm text-slate-500">Chargement des réservations…</div>
          )}
          {error && (
            <div className="p-4 text-sm text-red-600">Erreur de chargement des réservations.</div>
          )}
          {!isLoading && !error && (
          <>
          <div className="flex items-center justify-end p-2">
            <button className="border rounded px-3 py-1 bg-slate-100 hover:bg-slate-200" onClick={()=>{
              const headers = ['Date','Heure','Client','Email','Pax','Langue','Paiement','Statut Paiement']
              const rows = bookings.map((b:any)=>[
                format(new Date(b.startTime),'yyyy-MM-dd'),
                format(new Date(b.startTime),'HH:mm'),
                `${b.user?.firstName||''} ${b.user?.lastName||''}`.trim(),
                b.user?.email||'',
                String(b.numberOfPeople||0),
                b.language||'',
                `${b.payments?.[0]?.provider||''}${b.payments?.[0]?.methodType?` (${b.payments[0].methodType})`:''}`,
                `${b.payments?.[0]?.status||''}`
              ])
              const csv = [headers, ...rows].map(r=> r.map(v => {
                const s = String(v).replace(/"/g,'""')
                return `"${s}"`
              }).join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              const suffix = range==='day' ? format(date,'yyyy-MM-dd') : (range==='month' ? monthStr : yearStr)
              a.href = url; a.download = `reservations_${range}_${suffix}.csv`
              document.body.appendChild(a); a.click(); document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}>Exporter CSV</button>
          </div>
          <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-3">Date</th>
              <th className="p-3">Heure</th>
              <th className="p-3">Client</th>
              <th className="p-3">Pax</th>
              <th className="p-3">Langue</th>
              <th className="p-3">Paiement</th>
              <th className="p-3">Statut Paiement</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b:any)=>(
              <tr key={b.id} className={`border-b hover:bg-slate-50 ${selectedId===b.id?'bg-yellow-50':''}`} onClick={()=>setSelectedId(b.id)}>
                <td className="p-3">{format(new Date(b.startTime),'dd/MM/yyyy')}</td>
                <td className="p-3">{format(new Date(b.startTime),'HH:mm')}</td>
                <td className="p-3">{b.user?.firstName} {b.user?.lastName}</td>
                <td className="p-3">{b.numberOfPeople}</td>
                <td className="p-3">{b.language}</td>
                <td className="p-3">
                  {(b.payments?.[0]?.provider || '—')}{b.payments?.[0]?.methodType ? ` (${b.payments[0].methodType})` : ''}
                  <div className="mt-2 flex gap-2">
                    <button className="border rounded px-2 py-1" onClick={(e)=>{e.stopPropagation(); setShowView(b)}}>Voir</button>
                    <button className="border rounded px-2 py-1" onClick={(e)=>{e.stopPropagation(); setShowEdit(b)}}>Modifier</button>
                    <button className="border rounded px-2 py-1" onClick={async (e)=>{e.stopPropagation(); const ok = window.confirm('Confirmer la suppression ?'); if(!ok) return; const resp = await fetch(`/api/bookings/${b.id}`, { method:'DELETE' }); if(resp.ok){ mutate(); setToasts(t=>[...t,{id:Date.now(),type:'success',message:'Réservation supprimée'}]) }}}>Supprimer</button>
                    <button className="border rounded px-2 py-1 bg-blue-600 text-white" onClick={(e)=>{ e.stopPropagation(); setMarkPaid({ id: b.id, provider: '', methodType: undefined }) }}>Marquer Payé</button>
                  </div>
                  {markPaid?.id===b.id && (
                    <div className="mt-2 p-2 border rounded bg-slate-50" onClick={e=>e.stopPropagation()}>
                      <div className="text-xs mb-1">Sélectionnez le moyen de paiement</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select className="border rounded px-2 py-1" value={markPaid?.provider || ''} onChange={e=>{
                          const val = e.target.value
                          setMarkPaid(prev=> prev ? { ...prev, provider: val, methodType: (val==='voucher' ? (prev.methodType||'ANCV') : undefined) } : null)
                        }}>
                          <option value="">-- moyen --</option>
                          <option value="cash">Espèces</option>
                          <option value="card">Carte</option>
                          <option value="paypal">PayPal</option>
                          <option value="applepay">Apple Pay</option>
                          <option value="googlepay">Google Pay</option>
                          <option value="voucher">ANCV / CityPass</option>
                        </select>
                        {markPaid?.provider==='voucher' && (
                          <select className="border rounded px-2 py-1" value={markPaid?.methodType||'ANCV'} onChange={e=> setMarkPaid(prev=> prev ? { ...prev, methodType: e.target.value } : prev)}>
                            <option value="ANCV">ANCV</option>
                            <option value="CityPass">CityPass</option>
                          </select>
                        )}
                        <button className="border rounded px-2 py-1 bg-green-600 text-white" onClick={async ()=>{
                          if (!markPaid?.provider) { alert('Sélectionnez un moyen de paiement'); return }
                          const payload:any = { newIsPaid: true, paymentMethod: { provider: markPaid.provider, methodType: markPaid.provider==='voucher' ? markPaid.methodType : undefined } }
                          const resp = await fetch(`/api/bookings/${b.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                          if (resp.ok) { setMarkPaid(null); mutate(); setToasts(t=>[...t,{id:Date.now(),type:'success',message:'Réservation marquée comme payée'}]) }
                          else { alert('Échec de la mise à jour du paiement'); }
                        }}>Valider</button>
                        <button className="border rounded px-2 py-1" onClick={()=> setMarkPaid(null)}>Annuler</button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="p-3">{b.payments?.[0]?.status || '—'}</td>
              </tr>
            ))}
          </tbody>
          </table>
          </>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold mb-2">Chaîne (prévisualisation)</div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <input type="number" min={0} value={groupChain} onChange={e=>setGroupChain(parseInt(e.target.value||'0',10))} placeholder="Taille du groupe" className="border rounded px-2 py-1 w-44" />
              <input type="time" value={chainBaseTime} onChange={e=>setChainBaseTime(e.target.value)} className="border rounded px-2 py-1" />
              <button className="border rounded px-3 py-1 bg-slate-100 hover:bg-slate-200" onClick={()=>{
                const baseBooking: any = bookings.find((b:any)=>b.id===selectedId)
                const baseDate = baseBooking ? new Date(baseBooking.startTime) : new Date(date)
                // Use selected base time (HH:mm) always for preview
                const [hh, mm] = chainBaseTime.split(':').map(n=>parseInt(n,10))
                baseDate.setHours(hh||9, mm||0, 0, 0)
                const capacity = 12
                const INTERVAL_MIN = 30
                const DURATION_MIN = 90
                const total = Math.max(0, groupChain)
                const chunks = Math.ceil(total / capacity)
                const preview: Array<{ index: number, start: string, end: string, people: number }> = []
                for (let i = 0; i < chunks; i++) {
                  const s = new Date(baseDate.getTime() + i * INTERVAL_MIN * 60000)
                  const e = new Date(s.getTime() + DURATION_MIN * 60000)
                  const ppl = Math.min(capacity, total - i * capacity)
                  preview.push({ index: i + 1, start: format(s,'HH:mm'), end: format(e,'HH:mm'), people: ppl })
                }
                setChainPreview(preview)
              }}>Prévisualiser</button>
            </div>
            {chainPreview.length === 0 ? (
              <div className="text-sm text-slate-500">Sélectionnez une ligne (base horaire) puis prévisualisez.</div>
            ) : (
              <ul className="space-y-2">
                {chainPreview.map((c)=> (
                  <li key={c.index} className="text-sm flex items-center justify-between">
                    <span className="text-slate-600">#{c.index} • {c.start} → {c.end}</span>
                    <span className="font-medium">{c.people} pax</span>
                  </li>
                ))}
                <li className="text-xs mt-2 pt-2 border-t flex justify-between text-slate-600">
                  <span>Total prévu</span>
                  <span className="font-semibold">{chainPreview.reduce((acc,c)=>acc + c.people,0)} pax</span>
                </li>
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold mb-2">Options de chaîne</div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={inheritPaymentForChain} onChange={e=>setInheritPaymentForChain(e.target.checked)} />
              <span>
                Hériter des métadonnées de paiement
                <span className="block text-xs text-slate-500 mt-1">Copie le fournisseur et le type de paiement de la réservation sélectionnée pour les réservations créées. Les paiements restent « en attente » tant que non confirmés.</span>
              </span>
            </label>
            <button
              className="mt-3 border rounded px-3 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              disabled={chainCreating || groupChain<=0}
              onClick={async ()=>{
                setChainCreating(true)
                try {
                  const base = bookings.find((b:any)=>b.id===selectedId)
                  const baseRef = base ? new Date(base.startTime) : new Date(date)
                  const [hh, mm] = chainBaseTime.split(':').map(n=>parseInt(n,10))
                  baseRef.setHours(hh||9, mm||0, 0, 0)
                  const body = {
                    date: format(baseRef,'yyyy-MM-dd'),
                    time: format(baseRef,'HH:mm'),
                    adults: base.numberOfPeople,
                    children: 0,
                    babies: 0,
                    language: base.language || 'fr',
                    userDetails: { firstName: base?.user?.firstName || '', lastName: base?.user?.lastName || '', email: base?.user?.email || '' },
                    isStaffOverride: true,
                    groupChain,
                    inheritPaymentForChain,
                    paymentMethod: base?.payments?.[0] ? { provider: base.payments[0].provider, methodType: base.payments[0].methodType } : undefined
                  }
                  const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                  if (!res.ok) { setToasts(t=>[...t, { id: Date.now(), type:'warning', message:'Création de chaîne impossible' }]); return }
                  const payload = await res.json()
                  const createdCount = Array.isArray(payload.chainCreated) ? payload.chainCreated.length : 0
                  const overlapCount = Array.isArray(payload.overlaps) ? payload.overlaps.length : 0
                  if (createdCount>0) setToasts(t=>[...t, { id: Date.now(), type:'success', message:`Chaîne créée: ${createdCount} créées, ${overlapCount} conflits` }])
                  else setToasts(t=>[...t, { id: Date.now(), type:'warning', message:`Aucune création, ${overlapCount} conflits` }])
                } catch {
                  setToasts(t=>[...t, { id: Date.now(), type:'warning', message:'Erreur réseau' }])
                } finally {
                  setChainCreating(false)
                }
              }}
            >{chainCreating ? 'Création…' : 'Créer la chaîne'}</button>
          </div>
        </div>
      </div>

      {toasts.length>0 && (
        <div className="fixed bottom-4 right-4 space-y-2">
          {toasts.map(t=> (
            <div key={t.id} className={`rounded-lg shadow px-4 py-2 text-sm ${t.type==='success'?'bg-green-600 text-white':'bg-yellow-500 text-white'}`}>
              <div className="flex items-center justify-between gap-3">
                <span>{t.message}</span>
                <button className="text-white/80" onClick={()=> setToasts(prev=> prev.filter(x=>x.id!==t.id))}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={()=>setShowCreate(false)}>
          <div className="bg-white rounded shadow p-4 w-full max-w-xl" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Créer une réservation</div>
              <button onClick={()=>setShowCreate(false)}>✕</button>
            </div>
            <div className="flex gap-2 mb-3">
              <button className={`border rounded px-3 py-1 ${createTab==='normal'?'bg-slate-100':''}`} onClick={()=>setCreateTab('normal')}>Normale</button>
              <button className={`border rounded px-3 py-1 ${createTab==='private'?'bg-slate-100':''}`} onClick={()=>setCreateTab('private')}>Privatisation</button>
              <button className={`border rounded px-3 py-1 ${createTab==='group'?'bg-slate-100':''}`} onClick={()=>setCreateTab('group')}>Groupe</button>
              <button className={`border rounded px-3 py-1 ${createTab==='contact'?'bg-slate-100':''}`} onClick={async()=>{ setCreateTab('contact'); const qs = contactStatus?`?status=${contactStatus}`:''; const r = await fetch(`/api/admin/contacts${qs}`); const c = await r.json(); setContacts(Array.isArray(c)?c:[]) }}>Depuis contact</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded px-2 py-1" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} placeholder="Date (YYYY-MM-DD)" />
                <input className="border rounded px-2 py-1" value={form.time} onChange={e=>setForm({...form, time:e.target.value})} placeholder="Heure (HH:mm)" />
              </div>
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
              {createTab==='group' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="border rounded px-2 py-1" value={form.company||''} onChange={e=>setForm({...form, company:e.target.value})} placeholder="Entreprise" />
                    <input className="border rounded px-2 py-1" value={form.phone||''} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="Téléphone" />
                  </div>
                  <input className="border rounded px-2 py-1 w-full" value={form.address||''} onChange={e=>setForm({...form, address:e.target.value})} placeholder="Adresse" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="date" className="border rounded px-2 py-1" value={form.eventDate||''} onChange={e=>setForm({...form, eventDate:e.target.value})} placeholder="Date évènement" />
                    <input type="time" className="border rounded px-2 py-1" value={form.eventTime||''} onChange={e=>setForm({...form, eventTime:e.target.value})} placeholder="Heure évènement" />
                    <input className="border rounded px-2 py-1" value={form.budget||''} onChange={e=>setForm({...form, budget:e.target.value})} placeholder="Budget" />
                  </div>
                  <input className="border rounded px-2 py-1 w-full" value={form.reason||''} onChange={e=>setForm({...form, reason:e.target.value})} placeholder="Raison / Type d'évènement" />
                  <textarea className="border rounded px-2 py-1 w-full" rows={3} value={form.message||''} onChange={e=>setForm({...form, message:e.target.value})} placeholder="Message / Notes supplémentaires" />
                </>
              )}
              {createTab==='private' && (
                <div className="text-sm text-gray-600">Privatisation: le créneau sera fermé (capacité complète).</div>
              )}
              {createTab==='group' && (
                <div className="text-sm text-gray-600">Groupe: entrez la taille dans "Adultes" et l'API chaînera selon la capacité.</div>
              )}
              {createTab==='contact' && (
                <div>
                  <div className="text-sm mb-2">Sélectionnez un contact à convertir</div>
                  <div className="flex items-center gap-2 mb-2">
                    <select className="border rounded px-2 py-1" value={contactStatus} onChange={async e=>{ setContactStatus(e.target.value as any); const qs = e.target.value?`?status=${e.target.value}`:''; const r = await fetch(`/api/admin/contacts${qs}`); const c = await r.json(); setContacts(Array.isArray(c)?c:[]) }}>
                      <option value="">Tous</option>
                      <option value="NEW">Nouveaux</option>
                      <option value="CONTACTED">Contactés</option>
                      <option value="CLOSED">Fermés</option>
                    </select>
                    <select className="border rounded px-2 py-1" value={selectedContactId} onChange={e=>setSelectedContactId(e.target.value)}>
                      <option value="">—</option>
                      {contacts.map((c:any)=> (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName} • {c.email}</option>
                      ))}
                    </select>
                  </div>
                  <button className="border rounded px-3 py-1 bg-blue-600 text-white disabled:opacity-50" disabled={contactConverting || !selectedContactId} onClick={async ()=>{
                    setContactConverting(true)
                    try {
                      const r = await fetch('/api/admin/contacts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: selectedContactId, kind: 'group' }) })
                      if (r.ok) { setShowCreate(false); setSelectedContactId(''); setContacts([]); setToasts(t=>[...t, { id: Date.now(), type:'success', message:'Contact converti en réservation' }]) }
                      else { setToasts(t=>[...t, { id: Date.now(), type:'warning', message:'Conversion impossible' }]) }
                    } catch {
                      setToasts(t=>[...t, { id: Date.now(), type:'warning', message:'Erreur réseau' }])
                    } finally {
                      setContactConverting(false)
                    }
                  }}>{contactConverting ? 'Conversion…' : 'Convertir'}</button>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="border rounded px-3 py-1" onClick={()=>setShowCreate(false)}>Annuler</button>
              <button className="border rounded px-3 py-1 bg-blue-600 text-white disabled:opacity-50" disabled={creating} onClick={async ()=>{
                setCreating(true)
                const baseBody = {
                  date: form.date,
                  time: form.time,
                  adults: form.adults,
                  children: form.children,
                  babies: form.babies,
                  language: form.language,
                  userDetails: { firstName: form.firstName, lastName: form.lastName, email: form.email },
                  isStaffOverride: true
                }
                try {
                  let resp: Response
                  if (createTab==='private') {
                    resp = await fetch('/api/bookings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...baseBody, private: true }) })
                  } else if (createTab==='group') {
                    const extended = {
                      ...baseBody,
                      groupChain: form.adults,
                      message: form.message,
                      groupDetails: {
                        company: form.company || '',
                        address: form.address || '',
                        phone: form.phone || '',
                        eventDate: form.eventDate || '',
                        eventTime: form.eventTime || '',
                        budget: form.budget || '',
                        reason: form.reason || ''
                      }
                    }
                    resp = await fetch('/api/bookings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(extended) })
                  } else {
                    resp = await fetch('/api/bookings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(baseBody) })
                  }
                  if (resp.ok) { setShowCreate(false); setToasts(t=>[...t,{id:Date.now(),type:'success',message:'Réservation créée'}]) } else { setToasts(t=>[...t,{id:Date.now(),type:'warning',message:'Création impossible'}]) }
                } catch {
                  setToasts(t=>[...t,{id:Date.now(),type:'warning',message:'Erreur réseau'}])
                } finally {
                  setCreating(false)
                }
              }}>Créer</button>
            </div>
          </div>
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
              <div>Statut paiement: {showView.payments?.[0]?.status || '—'}</div>
              <div className="mt-3 flex gap-2">
                <button className="border rounded px-3 py-1 bg-blue-600 text-white" onClick={()=> setViewMarkPaid({ provider: '', methodType: undefined })}>Marquer Payé</button>
                {viewMarkPaid && (
                  <div className="mt-2 p-2 border rounded bg-slate-50 w-full">
                    <div className="text-xs mb-1">Sélectionnez le moyen de paiement</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select className="border rounded px-2 py-1" value={viewMarkPaid.provider} onChange={e=>{
                        const val = e.target.value
                        setViewMarkPaid(prev=> prev ? { ...prev, provider: val, methodType: (val==='voucher' ? (prev.methodType||'ANCV') : undefined) } : null)
                      }}>
                        <option value="">-- moyen --</option>
                        <option value="cash">Espèces</option>
                        <option value="card">Carte</option>
                        <option value="paypal">PayPal</option>
                        <option value="applepay">Apple Pay</option>
                        <option value="googlepay">Google Pay</option>
                        <option value="voucher">ANCV / CityPass</option>
                      </select>
                      {viewMarkPaid.provider==='voucher' && (
                        <select className="border rounded px-2 py-1" value={viewMarkPaid.methodType||'ANCV'} onChange={e=> setViewMarkPaid(prev=> prev ? { ...prev, methodType: e.target.value } : prev)}>
                          <option value="ANCV">ANCV</option>
                          <option value="CityPass">CityPass</option>
                        </select>
                      )}
                      <button className="border rounded px-2 py-1 bg-green-600 text-white" onClick={async ()=>{
                        if (!viewMarkPaid?.provider) { alert('Sélectionnez un moyen de paiement'); return }
                        const payload:any = { newIsPaid: true, paymentMethod: { provider: viewMarkPaid.provider, methodType: viewMarkPaid.provider==='voucher' ? viewMarkPaid.methodType : undefined } }
                        const resp = await fetch(`/api/bookings/${showView.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                        if (resp.ok) { setViewMarkPaid(null); setShowView(null); mutate(); setToasts(t=>[...t,{id:Date.now(),type:'success',message:'Réservation marquée comme payée'}]) }
                        else { alert('Échec de la mise à jour du paiement'); }
                      }}>Valider</button>
                      <button className="border rounded px-2 py-1" onClick={()=> setViewMarkPaid(null)}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
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
            <EditForm booking={showEdit} onClose={()=>setShowEdit(null)} onSaved={()=>{ setShowEdit(null); mutate(); setToasts(t=>[...t,{id:Date.now(),type:'success',message:'Réservation modifiée'}]) }} />
          </div>
        </div>
      )}

    </div>
  )
}

function EditForm({ booking, onClose, onSaved }: any){
  const [ed, setEd] = useState({
    date: format(new Date(booking.startTime),'yyyy-MM-dd'),
    time: format(new Date(booking.startTime),'HH:mm'),
    adults: booking.adults ?? booking.numberOfPeople,
    children: booking.children ?? 0,
    babies: booking.babies ?? 0,
    language: booking.language || 'fr',
    isPaid: booking.isPaid || false,
    paymentProvider: booking.payments?.[0]?.provider || '',
    paymentMethodType: booking.payments?.[0]?.methodType || ''
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
        <div className="flex items-center gap-2 mt-2">
          <label className="text-sm font-semibold">Payé ?</label>
          <input type="checkbox" checked={ed.isPaid} onChange={e=>setEd({...ed, isPaid: e.target.checked})} />
          {ed.isPaid && (
            <select className="border rounded px-2 py-1" value={ed.paymentProvider} onChange={e=>{
              const val = e.target.value
              setEd({...ed, paymentProvider: val, paymentMethodType: (val==='voucher'? (ed.paymentMethodType||'ANCV') : '') })
            }}>
              <option value="">-- moyen --</option>
              <option value="cash">Espèces</option>
              <option value="card">Carte</option>
              <option value="paypal">PayPal</option>
              <option value="applepay">Apple Pay</option>
              <option value="googlepay">Google Pay</option>
              <option value="voucher">ANCV / CityPass</option>
            </select>
          )}
          {ed.isPaid && ed.paymentProvider==='voucher' && (
            <select className="border rounded px-2 py-1" value={ed.paymentMethodType} onChange={e=>setEd({...ed, paymentMethodType: e.target.value})}>
              <option value="ANCV">ANCV</option>
              <option value="CityPass">CityPass</option>
            </select>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="border rounded px-3 py-1" onClick={onClose}>Annuler</button>
        <button className="border rounded px-3 py-1 bg-blue-600 text-white" onClick={async ()=>{
          const payload:any = { adults: ed.adults, children: ed.children, babies: ed.babies, language: ed.language, newIsPaid: ed.isPaid }
          if (ed.date && ed.time) { payload.date = ed.date; payload.time = ed.time }
          if (ed.isPaid) {
            if (!ed.paymentProvider) { alert('Sélectionnez un moyen de paiement'); return }
            payload.paymentMethod = { provider: ed.paymentProvider, methodType: ed.paymentProvider==='voucher' ? ed.paymentMethodType : undefined }
          }
          const ok = window.confirm('Confirmer la modification de cette réservation ?');
          if (!ok) return;
          const resp = await fetch(`/api/bookings/${booking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          if (resp.ok) { onSaved() } else { onClose() }
        }}>Enregistrer</button>
      </div>
    </div>
  )
}

