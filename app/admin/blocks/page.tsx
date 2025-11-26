'use client'

import { useEffect, useState } from 'react'

export default function BlocksAdminPage() {
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [scope, setScope] = useState<'day'|'morning'|'afternoon'|'specific'>('specific')
  const [reason, setReason] = useState('')
  const [day, setDay] = useState('') // YYYY-MM-DD (Europe/Paris)

  // Helpers to build UTC ISO from Paris wall time
  const makeUtcIso = (dateStr: string, hh: number, mm: number) => {
    // Build a UTC ISO by using Date.UTC with wall-clock parts
    const [y, m, d] = dateStr.split('-').map(Number)
    const iso = new Date(Date.UTC(y, m - 1, d, hh, mm, 0)).toISOString().slice(0, 16)
    return iso
  }

  const applyPreset = (preset: 'day'|'morning'|'afternoon') => {
    if (!day) return
    if (preset === 'day') {
      // Whole day window
      setScope('day')
      setStart(makeUtcIso(day, 0, 0))
      setEnd(makeUtcIso(day, 23, 59))
    } else if (preset === 'morning') {
      // Paris morning window (example: 10:00–12:00)
      setScope('morning')
      setStart(makeUtcIso(day, 10, 0))
      setEnd(makeUtcIso(day, 12, 0))
    } else if (preset === 'afternoon') {
      // Paris afternoon window (example: 13:30–18:00)
      setScope('afternoon')
      setStart(makeUtcIso(day, 13, 30))
      setEnd(makeUtcIso(day, 18, 0))
    }
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
      setStart(''); setEnd(''); setReason('')
      await load()
    }
  }

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/blocks?id=${id}`, { method: 'DELETE' })
    if (res.ok) await load()
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Blocages de réservation</h1>
        <p className="text-slate-600 mb-6">Créez des intervalles où la réservation est impossible (journée, matin, après-midi, ou spécifiques).</p>

        <div className="bg-white border rounded p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          <div>
            <label className="block text-xs text-slate-500">Début (UTC)</label>
            <input type="datetime-local" value={start} onChange={(e)=>setStart(e.target.value)} className="border px-2 py-1 rounded w-full" />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Fin (UTC)</label>
            <input type="datetime-local" value={end} onChange={(e)=>setEnd(e.target.value)} className="border px-2 py-1 rounded w-full" />
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
          <div className="md:col-span-2">
            <button onClick={create} className="bg-blue-600 text-white px-4 py-2 rounded">Créer le blocage</button>
          </div>
        </div>

        <div className="bg-white border rounded overflow-hidden">
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
                      <button onClick={()=>remove(b.id)} className="text-red-600 hover:underline">Supprimer</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
