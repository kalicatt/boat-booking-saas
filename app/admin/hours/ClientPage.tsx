'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Props = {
  canManage?: boolean
  ownOnly?: boolean
}

export default function ClientHoursPage({ canManage = false, ownOnly = false }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [report, setReport] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('GUEST')
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [openUsers, setOpenUsers] = useState<Record<string, boolean>>({})
  const [editingShift, setEditingShift] = useState<any | null>(null)

  const [errors, setErrors] = useState<string[]>([])
  const [form, setForm] = useState({
    userId: '',
    date: new Date().toISOString().slice(0, 10),
    start: '08:00',
    end: '17:00',
    breakTime: '01:00',
    note: ''
  })

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/hours?month=${currentMonth}`)
      const data = await res.json()
      const filtered = ownOnly && me?.id ? data.filter((r: any) => r.user.id === me.id) : data
      setReport(filtered)
      const emps = filtered.map((r: any) => r.user)
      setEmployees(emps)
      const defaultUserId = ownOnly && me?.id ? me.id : (emps[0]?.id || '')
      if (!form.userId && defaultUserId) {
        setForm((prev) => ({ ...prev, userId: defaultUserId }))
      }
      const initOpen: Record<string, boolean> = {}
      filtered.forEach((r: any, idx: number) => {
        initOpen[r.user.id] = idx === 0
      })
      setOpenUsers(initOpen)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentMonth])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setRole(data.role || 'GUEST')
          if (data.id) setMe({ id: data.id })
        }
      } catch {}
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    const [sH, sM] = form.start.split(':').map(Number)
    const [eH, eM] = form.end.split(':').map(Number)
    const startMinutes = sH * 60 + sM
    const endMinutes = eH * 60 + eM
    const breakInMinutes = timeToMinutes(form.breakTime)

    const newErrors: string[] = []
    if (isNaN(startMinutes) || isNaN(endMinutes)) newErrors.push('Horaires invalides.')
    if (startMinutes >= endMinutes) newErrors.push("Heure de début doit être avant l'heure de fin.")
    if (breakInMinutes < 0) newErrors.push("Pause ne peut pas être négative.")
    if (breakInMinutes > 8 * 60) newErrors.push('Pause ne peut pas dépasser 8 heures.')
    const netMinutes = endMinutes - startMinutes - breakInMinutes
    if (netMinutes < 0) newErrors.push('Les heures nettes ne peuvent pas être négatives.')

    if (newErrors.length) {
      setErrors(newErrors)
      return
    }

    try {
      const res = await fetch('/api/admin/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          breakTime: breakInMinutes
        })
      })
      if (res.ok) {
        fetchData()
        alert('✅ Shift ajouté avec succès !')
      } else {
        const err = await res.json()
        alert('❌ Erreur : ' + err.error)
      }
    } catch (e) {
      alert('Erreur technique')
    }
  }

  const formatWallDate = (iso: string) => {
    const d = new Date(iso)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${day}/${m}/${y}`
  }

  const formatWallTime = (iso: string) => {
    const d = new Date(iso)
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const exportCSV = () => {
    const headers = ['Employé', 'Date', 'Début', 'Fin', 'Pause(min)', 'Net(h)']
    const rows: string[] = []
    rows.push(headers.join(','))
    report.forEach((row: any) => {
      row.details
        .sort(
          (a: any, b: any) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
        .forEach((shift: any) => {
          const dateStr = formatWallDate(shift.startTime)
          const startStr = formatWallTime(shift.startTime)
          const endStr = formatWallTime(shift.endTime)
          const rawMin =
            (new Date(shift.endTime).getTime() -
              new Date(shift.startTime).getTime()) /
            60000
          const netH = (Math.max(0, rawMin - shift.breakMinutes) / 60).toFixed(2)
          rows.push([
            `${row.user.firstName} ${row.user.lastName}`,
            dateStr,
            startStr,
            endStr,
            String(shift.breakMinutes || 0),
            netH
          ].join(','))
        })
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heures_${currentMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleUser = (userId: string) => {
    setOpenUsers((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  const startEdit = (shift: any) => {
    setEditingShift({
      id: shift.id,
      userId: shift.userId,
      date: (() => {
        const d = new Date(shift.startTime)
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      })(),
      start: formatWallTime(shift.startTime),
      end: formatWallTime(shift.endTime),
      breakTime: `${String(Math.floor((shift.breakMinutes || 0) / 60)).padStart(2, '0')}:${String((shift.breakMinutes || 0) % 60).padStart(2, '0')}`,
      note: shift.note || ''
    })
  }

  const cancelEdit = () => setEditingShift(null)

  const submitEdit = async () => {
    if (!editingShift) return
    const breakInMinutes = timeToMinutes(editingShift.breakTime)
    try {
      const res = await fetch('/api/admin/hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingShift.id,
          date: editingShift.date,
          start: editingShift.start,
          end: editingShift.end,
          breakTime: breakInMinutes,
          note: editingShift.note
        })
      })
      if (res.ok) {
        cancelEdit()
        fetchData()
        alert('✅ Shift modifié avec succès !')
      } else {
        const err = await res.json()
        alert('❌ Erreur: ' + err.error)
      }
    } catch {
      alert('Erreur technique')
    }
  }

  const deleteShift = async (shift: any) => {
    if (!shift?.id) return
    const ok = window.confirm('Confirmer la suppression de ce shift ?')
    if (!ok) return
    try {
      const res = await fetch('/api/admin/hours', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shift.id })
      })
      if (res.ok) {
        cancelEdit()
        fetchData()
        alert('🗑️ Shift supprimé.')
      } else {
        const err = await res.json()
        alert('❌ Erreur: ' + err.error)
      }
    } catch {
      alert('Erreur technique')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 print:bg-white print:p-0 sn-admin">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-block">
              ← Retour
            </Link>
            <h1 className="text-3xl font-bold text-slate-800">Pointage & Paie 🕒</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs px-2 py-1 rounded border bg-white text-slate-700">Rôle: {role}</span>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 mr-2">Période :</label>
              <input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="border p-2 rounded shadow-sm font-bold text-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
          <div className="lg:col-span-1 print:hidden">
            <div className="sn-card sticky top-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Saisir une journée</h3>
              {!canManage && (
                <div className="mb-4 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-3">
                  Seuls les administrateurs peuvent modifier les heures.
                </div>
              )}
              {errors.length > 0 && (
                <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                  <ul className="list-disc pl-5">
                    {errors.map((er, idx) => (
                      <li key={idx}>{er}</li>
                    ))}
                  </ul>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Employé</label>
                  <select
                    className="w-full p-2 border rounded bg-slate-50 font-medium"
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    disabled={ownOnly}
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Début</label>
                    <input
                      type="time"
                      className="w-full p-2 border rounded"
                      value={form.start}
                      onChange={(e) => setForm({ ...form, start: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Fin</label>
                    <input
                      type="time"
                      className="w-full p-2 border rounded"
                      value={form.end}
                      onChange={(e) => setForm({ ...form, end: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Pause (HH:mm)</label>
                  <input
                    type="time"
                    className="w-full p-2 border rounded"
                    value={form.breakTime}
                    onChange={(e) => setForm({ ...form, breakTime: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Note (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Remplacement..."
                    className="w-full p-2 border rounded"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canManage}
                  className="sn-btn-primary w-full disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Enregistrer le pointage
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sn-card overflow-hidden print:shadow-none print:border-none">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center print:bg-white print:border-black">
                <h3 className="font-bold text-slate-700 text-lg">Rapport d'Heures - {currentMonth}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="text-xs bg-white border px-3 py-1 rounded hover:bg-slate-100 print:hidden font-bold"
                  >
                    🖨️ Imprimer
                  </button>
                  <button
                    onClick={() => exportCSV()}
                    className="text-xs bg-white border px-3 py-1 rounded hover:bg-slate-100 print:hidden font-bold"
                  >
                    ⬇️ Export CSV
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400">Calcul en cours...</div>
              ) : (
                <div className="p-4 space-y-8">
                  {report.map((row) => (
                    <div
                      key={row.user.id}
                      className="border rounded-lg overflow-hidden print:border-black mb-6 break-inside-avoid"
                    >
                      <div className="bg-slate-100 p-3 flex justify-between items-center print:bg-slate-200">
                        <button
                          onClick={() => toggleUser(row.user.id)}
                          className="font-bold text-slate-900 flex items-center gap-2"
                        >
                          <span className="inline-block w-4 text-center">
                            {openUsers[row.user.id] ? '▾' : '▸'}
                          </span>
                          {row.user.firstName} {row.user.lastName.toUpperCase()}
                        </button>
                        <div className="text-sm">
                          <span className="text-slate-500 mr-2">{row.shiftsCount} jours</span>
                          <span className="bg-blue-600 text-white px-2 py-1 rounded font-bold print:text-black print:border print:border-black print:bg-white">
                            Total : {row.totalHours} h
                          </span>
                        </div>
                      </div>

                      {openUsers[row.user.id] && (
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-normal text-xs uppercase border-b dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                            <tr>
                              <th className="p-2 pl-4">Date</th>
                              <th className="p-2">Horaires</th>
                              <th className="p-2">Pause</th>
                              <th className="p-2 text-right pr-4">Total Net</th>
                              {canManage && (
                                <th className="p-2 text-right pr-4">Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {row.details.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                                  Aucune heure saisie ce mois-ci.
                                </td>
                              </tr>
                            ) : (
                              Object.entries(
                                row.details
                                  .sort(
                                    (a: any, b: any) =>
                                      new Date(a.startTime).getTime() -
                                      new Date(b.startTime).getTime()
                                  )
                                  .reduce((acc: any, shift: any) => {
                                    const key = formatWallDate(shift.startTime)
                                    acc[key] = acc[key] || []
                                    acc[key].push(shift)
                                    return acc
                                  }, {})
                              ).map(([day, shifts]: [string, any]) => {
                                const rows = shifts.map((shift: any) => {
                                  const rawMin =
                                    (new Date(shift.endTime).getTime() -
                                      new Date(shift.startTime).getTime()) /
                                    60000
                                  const netMin = Math.max(0, rawMin - shift.breakMinutes)
                                  const netH = (netMin / 60).toFixed(2)
                                  return { shift, netMin, netH }
                                })
                                const dayTotalH = (
                                  rows.reduce((s: number, r: any) => s + r.netMin, 0) / 60
                                ).toFixed(2)
                                return (
                                  <>
                                    {rows.map(({ shift, netH }: any) => (
                                      <tr key={shift.id}>
                                        <td className="p-2 pl-4 font-medium">{day}</td>
                                        <td className="p-2 text-slate-600">
                                          {formatWallTime(shift.startTime)} - {formatWallTime(shift.endTime)}
                                        </td>
                                        <td className="p-2 text-slate-500 italic">
                                          {shift.breakMinutes > 0
                                            ? `-${Math.floor((shift.breakMinutes || 0) / 60)}h${(
                                                (shift.breakMinutes || 0) % 60
                                              )
                                                .toString()
                                                .padStart(2, '0')}`
                                            : '-'}
                                        </td>
                                        <td className="p-2 pr-4 text-right font-bold text-slate-700">
                                          {netH} h
                                        </td>
                                        {canManage && (
                                          <td className="p-2 pr-4 text-right">
                                            <button
                                              onClick={() => startEdit(shift)}
                                              className="text-xs bg-white border px-2 py-1 rounded hover:bg-slate-100"
                                              aria-label="Modifier"
                                            >
                                              ✏️
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                    <tr>
                                      <td className="p-2 pl-4 font-bold text-slate-700">Total jour</td>
                                      <td className="p-2 text-slate-600" colSpan={2}></td>
                                      <td className="p-2 pr-4 text-right font-bold text-blue-700">
                                        {dayTotalH} h
                                      </td>
                                      {canManage && (
                                        <td></td>
                                      )}
                                    </tr>
                                  </>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingShift && canManage && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4">Modifier le shift</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={editingShift.date}
                  onChange={(e) => setEditingShift({ ...editingShift, date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Début</label>
                  <input
                    type="time"
                    className="w-full p-2 border rounded"
                    value={editingShift.start}
                    onChange={(e) => setEditingShift({ ...editingShift, start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fin</label>
                  <input
                    type="time"
                    className="w-full p-2 border rounded"
                    value={editingShift.end}
                    onChange={(e) => setEditingShift({ ...editingShift, end: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Pause (HH:mm)</label>
                <input
                  type="time"
                  className="w-full p-2 border rounded"
                  value={editingShift.breakTime}
                  onChange={(e) => setEditingShift({ ...editingShift, breakTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Note</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={editingShift.note}
                  onChange={(e) => setEditingShift({ ...editingShift, note: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between gap-2">
              <button
                onClick={() => deleteShift(editingShift)}
                className="px-3 py-2 border border-red-300 text-red-700 rounded hover:bg-red-50"
              >
                Supprimer
              </button>
              <div className="flex gap-2">
                <button onClick={cancelEdit} className="px-3 py-2 border rounded">
                  Annuler
                </button>
                <button onClick={submitEdit} className="px-3 py-2 bg-blue-600 text-white rounded">
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
