'use client'

import { useEffect, useState } from 'react'
import { AdminPageShell } from '../_components/AdminPageShell'

export default function ClientBlocksAdminPage() {
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [scope, setScope] = useState<'day'|'morning'|'afternoon'|'specific'>('specific')
  const [reason, setReason] = useState('')
  const [day, setDay] = useState('') // YYYY-MM-DD (Europe/Paris)
  const [presetApplied, setPresetApplied] = useState(false)
  const [editingId, setEditingId] = useState<string|undefined>(undefined)

  // Helpers to build UTC ISO from Paris wall time
  const makeUtcIso = (dateStr: string, hh: number, mm: number) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const iso = new Date(Date.UTC(y, m - 1, d, hh, mm, 0)).toISOString().slice(0, 16)
    return iso
  }

  const applyPreset = (preset: 'day'|'morning'|'afternoon') => {
    if (!day) return
    if (preset === 'day') {
      setScope('day')
      setStart(makeUtcIso(day, 0, 0))
      setEnd(makeUtcIso(day, 23, 59))
    } else if (preset === 'morning') {
      setScope('morning')
      setStart(makeUtcIso(day, 10, 0))
      setEnd(makeUtcIso(day, 12, 0))
    } else if (preset === 'afternoon') {
      setScope('afternoon')
      setStart(makeUtcIso(day, 13, 30))
      setEnd(makeUtcIso(day, 18, 0))
    }
    setPresetApplied(true)
  }

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/blocks')
    const data = await res.json()
    setBlocks(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!start || !end) return
    const res = await fetch('/api/admin/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end, scope, reason })
    })
    if (res.ok) {
      setStart(''); setEnd(''); setReason(''); setDay(''); setPresetApplied(false)
      await load()
    }
  }

  const saveEdit = async () => {
    if (!editingId) return
    const res = await fetch('/api/admin/blocks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, start, end, scope, reason })
    })
    if (res.ok) {
      setEditingId(undefined); setStart(''); setEnd(''); setReason(''); setDay(''); setPresetApplied(false)
      await load()
    }
  }

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/blocks?id=${id}`, { method: 'DELETE' })
    if (res.ok) await load()
  }

  return (
    <AdminPageShell
      title="Blocages de réservation"
      description="Planifiez des indisponibilités ponctuelles ou récurrentes pour maîtriser l'ouverture des créneaux."
    >
      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 gap-4 rounded-xl border bg-white p-4 md:grid-cols-2">
          <div className="md:col-span-2 flex items-end gap-3">
            <div>
              <label className="block text-xs text-slate-500">Date (Europe/Paris)</label>
              <input type="date" value={day} onChange={(e)=>setDay(e.target.value)} className="border px-2 py-1 rounded" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={()=>applyPreset('day')} className="border px-3 py-1.5 rounded text-sm">Bloquer la journée</button>
              <button type="button" onClick={()=>applyPreset('morning')} className="border px-3 py-1.5 rounded text-sm">Bloquer la matinée</button>
              <button type="button" onClick={()=>applyPreset('afternoon')} className="border px-3 py-1.5 rounded text-sm">Bloquer l'après-midi</button>
            </div>
            {presetApplied && <span className="text-xs text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded">Préset appliqué</span>}
          </div>
          <div>
            <label className="block text-xs text-slate-500">Début (UTC)</label>
            <input type="datetime-local" value={start} onChange={(e)=>{ setStart(e.target.value); setPresetApplied(false) }} className="border px-2 py-1 rounded w-full" />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Fin (UTC)</label>
            <input type="datetime-local" value={end} onChange={(e)=>{ setEnd(e.target.value); setPresetApplied(false) }} className="border px-2 py-1 rounded w-full" />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Périmètre</label>
            <select value={scope} onChange={(e)=>setScope(e.target.value as any)} className="border px-2 py-1 rounded w-full">
              <option value="day">Journée</option>
              <option value="morning">Matinée</option>
              <option value="afternoon">Après-midi</option>
              <option value="specific">Spécifique</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Raison (optionnel)</label>
            <input value={reason} onChange={(e)=>setReason(e.target.value)} className="border px-2 py-1 rounded w-full" placeholder="Maintenance, événement..." />
          </div>
          <div className="md:col-span-2 flex gap-2">
            {!editingId ? (
              <button onClick={create} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={!start || !end}>Créer le blocage</button>
            ) : (
              <>
                <button onClick={saveEdit} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={!start || !end}>Enregistrer</button>
                <button onClick={()=>{ setEditingId(undefined); setStart(''); setEnd(''); setReason(''); setDay(''); setPresetApplied(false) }} className="border px-4 py-2 rounded">Annuler</button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Début</th>
                <th className="p-3 text-left">Fin</th>
                <th className="p-3 text-left">Périmètre</th>
                <th className="p-3 text-left">Raison</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center">Chargement...</td></tr>
              ) : blocks.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Aucun blocage</td></tr>
              ) : (
                blocks.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{new Date(b.start).toISOString()}</td>
                    <td className="p-3 font-mono text-xs">{new Date(b.end).toISOString()}</td>
                    <td className="p-3"><span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">{b.scope}</span></td>
                    <td className="p-3 text-slate-600">{b.reason || '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-3 justify-end">
                        <button onClick={()=>{
                          setEditingId(b.id)
                          setStart(new Date(b.start).toISOString().slice(0,16))
                          setEnd(new Date(b.end).toISOString().slice(0,16))
                          setScope(b.scope)
                          setReason(b.reason || '')
                          setDay('')
                          setPresetApplied(false)
                        }} className="text-blue-600 hover:underline">Éditer</button>
                        <button onClick={()=>remove(b.id)} className="text-red-600 hover:underline">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageShell>
  )
}
