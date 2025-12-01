'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { FormEvent } from 'react'
import { AdminPageShell } from '../_components/AdminPageShell'

type EmployeeRole = 'SUPERADMIN' | 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'GUEST' | string

type Props = {
  canManage?: boolean
  ownOnly?: boolean
}

type ReportUser = {
  id: string
  firstName?: string | null
  lastName?: string | null
  role?: EmployeeRole | null
}

type ShiftDetail = {
  id: string
  userId: string
  startTime: string
  endTime: string
  breakMinutes: number
  note?: string | null
  clockLatitude?: number | null
  clockLongitude?: number | null
  clockAccuracy?: number | null
}

type MonthlyReportEntry = {
  user: ReportUser
  totalHours: number
  shiftsCount: number
  details: ShiftDetail[]
}

type ShiftForm = {
  userId: string
  date: string
  start: string
  end: string
  breakTime: string
  note: string
}

type ShiftEditForm = ShiftForm & { id: string }

type MeResponse = {
  id?: string | null
  role?: EmployeeRole | null
}

const createDefaultShiftForm = (): ShiftForm => ({
  userId: '',
  date: new Date().toISOString().slice(0, 10),
  start: '08:00',
  end: '17:00',
  breakTime: '01:00',
  note: ''
})

const minutesToTime = (minutes: number | null | undefined): string => {
  const safe = typeof minutes === 'number' && Number.isFinite(minutes) ? Math.max(0, minutes) : 0
  const hours = Math.floor(safe / 60)
  const mins = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return Number.NaN
  const [hoursStr, minutesStr] = timeStr.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.NaN
  return hours * 60 + minutes
}

const formatWallDate = (iso: string): string => {
  const date = new Date(iso)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${day}/${month}/${year}`
}

const formatWallTime = (iso: string): string => {
  const date = new Date(iso)
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const isReportUser = (value: unknown): value is ReportUser => {
  if (!value || typeof value !== 'object') return false
  return typeof (value as { id?: unknown }).id === 'string'
}

const isShiftDetail = (value: unknown): value is ShiftDetail => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ShiftDetail>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.startTime === 'string' &&
    typeof candidate.endTime === 'string' &&
    typeof candidate.breakMinutes === 'number'
  )
}

const parseReportResponse = (payload: unknown): MonthlyReportEntry[] => {
  if (!Array.isArray(payload)) return []
  return payload.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const raw = entry as Record<string, unknown>
    if (!isReportUser(raw.user)) return []
    const detailsRaw = Array.isArray(raw.details) ? raw.details : []
    const details = detailsRaw.filter(isShiftDetail)
    return [{
      user: raw.user,
      totalHours: typeof raw.totalHours === 'number' ? raw.totalHours : 0,
      shiftsCount: typeof raw.shiftsCount === 'number' ? raw.shiftsCount : details.length,
      details
    }]
  })
}

const parseMeResponse = (payload: unknown): MeResponse => {
  if (!payload || typeof payload !== 'object') return {}
  const raw = payload as Record<string, unknown>
  return {
    id: typeof raw.id === 'string' ? raw.id : null,
    role: typeof raw.role === 'string' ? raw.role : null
  }
}

const uniqueEmployees = (entries: MonthlyReportEntry[]): ReportUser[] => {
  const map = new Map<string, ReportUser>()
  entries.forEach((entry) => {
    map.set(entry.user.id, entry.user)
  })
  return Array.from(map.values())
}

export default function ClientHoursPage({ canManage = false, ownOnly = false }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [report, setReport] = useState<MonthlyReportEntry[]>([])
  const [employees, setEmployees] = useState<ReportUser[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<EmployeeRole>('GUEST')
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [openUsers, setOpenUsers] = useState<Record<string, boolean>>({})
  const [editingShift, setEditingShift] = useState<ShiftEditForm | null>(null)

  const [errors, setErrors] = useState<string[]>([])
  const [form, setForm] = useState<ShiftForm>(() => createDefaultShiftForm())
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoPending, setGeoPending] = useState(false)

  const requiresLocation = !canManage

  const captureLocation = useCallback(async () => {
    const buildPayload = (coords: { latitude: number; longitude: number; accuracy?: number | null }) => ({
      latitude: Number(coords.latitude),
      longitude: Number(coords.longitude),
      accuracy: typeof coords.accuracy === 'number' && Number.isFinite(coords.accuracy) ? coords.accuracy : null
    })

    if (Capacitor.isNativePlatform()) {
      const status = await Geolocation.checkPermissions()
      if (status.location === 'denied' || status.location === 'prompt' || status.location === 'prompt-with-rationale') {
        const request = await Geolocation.requestPermissions()
        if (request.location === 'denied') {
          throw new Error('Autorisez la localisation pour enregistrer votre pointage.')
        }
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
      return buildPayload(position.coords)
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })
      return buildPayload(position.coords)
    }

    throw new Error('Géolocalisation indisponible sur cet appareil.')
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/hours?month=${currentMonth}`)
      if (!res.ok) {
        setReport([])
        setEmployees([])
        setOpenUsers({})
        return
      }
      const payload = (await res.json().catch(() => null)) as unknown
      const parsed = parseReportResponse(payload)
      const scoped = ownOnly && me?.id ? parsed.filter((entry) => entry.user.id === me.id) : parsed
      setReport(scoped)
      const team = uniqueEmployees(scoped)
      setEmployees(team)
      const defaultUserId = ownOnly && me?.id ? me.id : (team[0]?.id ?? '')
      if (defaultUserId) {
        setForm((prev) => (prev.userId ? prev : { ...prev, userId: defaultUserId }))
      }
      const initialOpen = scoped.reduce<Record<string, boolean>>((acc, entry, index) => {
        acc[entry.user.id] = index === 0
        return acc
      }, {})
      setOpenUsers(initialOpen)
    } catch (error) {
      console.error('Failed to load hours report', error)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, ownOnly, me?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const payload = (await res.json().catch(() => null)) as unknown
        if (cancelled) return
        const meInfo = parseMeResponse(payload)
        setRole(typeof meInfo.role === 'string' ? meInfo.role : 'GUEST')
        if (typeof meInfo.id === 'string') {
          setMe({ id: meInfo.id })
        }
      } catch (error) {
        console.error('Failed to load current user', error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors([])
    setGeoError(null)

    const startMinutes = timeToMinutes(form.start)
    const endMinutes = timeToMinutes(form.end)
    const breakInMinutes = timeToMinutes(form.breakTime)

    const newErrors: string[] = []
    if (!form.userId) newErrors.push('Sélectionnez un collaborateur.')
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) newErrors.push('Horaires invalides.')
    if (!Number.isNaN(startMinutes) && !Number.isNaN(endMinutes) && startMinutes >= endMinutes) {
      newErrors.push('Heure de début doit être avant l&apos;heure de fin.')
    }
    if (Number.isNaN(breakInMinutes)) newErrors.push('Format de pause invalide.')
    if (!Number.isNaN(breakInMinutes) && breakInMinutes < 0) newErrors.push('Pause ne peut pas être négative.')
    if (!Number.isNaN(breakInMinutes) && breakInMinutes > 8 * 60) newErrors.push('Pause ne peut pas dépasser 8 heures.')
    if (!Number.isNaN(startMinutes) && !Number.isNaN(endMinutes) && !Number.isNaN(breakInMinutes)) {
      const netMinutes = endMinutes - startMinutes - breakInMinutes
      if (netMinutes < 0) newErrors.push('Les heures nettes ne peuvent pas être négatives.')
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    let locationPayload: { latitude: number; longitude: number; accuracy: number | null } | null = null
    if (requiresLocation) {
      setGeoPending(true)
      try {
        locationPayload = await captureLocation()
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        setGeoError(message || 'Impossible de récupérer la localisation.')
        setGeoPending(false)
        return
      }
      setGeoPending(false)
    }

    try {
      const res = await fetch('/api/admin/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          breakTime: breakInMinutes,
          location: locationPayload
        })
      })
      if (res.ok) {
        await fetchData()
        alert('✅ Shift ajouté avec succès !')
        setGeoError(null)
      } else {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        if (res.status === 422) {
          setGeoError(err?.error ?? 'Autorisez la localisation pour pointer.')
          return
        }
        alert(`❌ Erreur : ${err?.error ?? 'Création impossible'}`)
      }
    } catch (error) {
      console.error('Failed to create shift', error)
      alert('Erreur technique')
    }
  }
  const exportCSV = () => {
    const headers = ['Employé', 'Date', 'Début', 'Fin', 'Pause(min)', 'Net(h)', 'Latitude', 'Longitude', 'Précision(m)']
    const rows: string[] = [headers.join(',')]
    report.forEach((entry) => {
      const sortedDetails = [...entry.details].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      sortedDetails.forEach((shift) => {
        const dateStr = formatWallDate(shift.startTime)
        const startStr = formatWallTime(shift.startTime)
        const endStr = formatWallTime(shift.endTime)
        const rawMinutes =
          (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / 60000
        const breakMinutes = Math.max(0, shift.breakMinutes)
        const netH = (Math.max(0, rawMinutes - breakMinutes) / 60).toFixed(2)
        const employeeName = `${entry.user.firstName ?? ''} ${entry.user.lastName ?? ''}`.trim()
        rows.push(
          [
            employeeName,
            dateStr,
            startStr,
            endStr,
            String(breakMinutes),
            netH,
            typeof shift.clockLatitude === 'number' && Number.isFinite(shift.clockLatitude)
              ? shift.clockLatitude.toFixed(6)
              : '',
            typeof shift.clockLongitude === 'number' && Number.isFinite(shift.clockLongitude)
              ? shift.clockLongitude.toFixed(6)
              : '',
            typeof shift.clockAccuracy === 'number' && Number.isFinite(shift.clockAccuracy)
              ? shift.clockAccuracy.toFixed(1)
              : ''
          ].join(',')
        )
      })
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `heures_${currentMonth}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const toggleUser = (userId: string) => {
    setOpenUsers((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  const startEdit = (shift: ShiftDetail) => {
    setEditingShift({
      id: shift.id,
      userId: shift.userId,
      date: (() => {
        const d = new Date(shift.startTime)
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      })(),
      start: formatWallTime(shift.startTime),
      end: formatWallTime(shift.endTime),
      breakTime: minutesToTime(shift.breakMinutes),
      note: shift.note ?? ''
    })
  }

  const cancelEdit = () => setEditingShift(null)

  const submitEdit = async () => {
    if (!editingShift) return
    const breakInMinutes = timeToMinutes(editingShift.breakTime)
    if (Number.isNaN(breakInMinutes)) {
      alert('Format de pause invalide.')
      return
    }
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
        await fetchData()
        alert('✅ Shift modifié avec succès !')
      } else {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        alert(`❌ Erreur : ${err?.error ?? 'Mise à jour impossible'}`)
      }
    } catch (error) {
      console.error('Failed to update shift', error)
      alert('Erreur technique')
    }
  }

  const deleteShift = async (shift: ShiftEditForm) => {
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
        await fetchData()
        alert('🗑️ Shift supprimé.')
      } else {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        alert(`❌ Erreur : ${err?.error ?? 'Suppression impossible'}`)
      }
    } catch (error) {
      console.error('Failed to delete shift', error)
      alert('Erreur technique')
    }
  }

  return (
    <AdminPageShell
      title="Pointage & Paie 🕒"
      description="Suivez les heures travaillées, générez les exports et ajustez les feuilles de temps."
      actions={(
        <div className="flex items-center gap-4 print:hidden">
          <span className="rounded border bg-white px-2 py-1 text-xs text-slate-700">Rôle&nbsp;: {role}</span>
          <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <span>Période</span>
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="rounded border p-2 font-bold text-slate-700 shadow-sm"
            />
          </label>
        </div>
      )}
      footerNote="Exports disponibles en CSV et impression directe."
    >
      <div className="grid grid-cols-1 gap-8 print:block lg:grid-cols-3">
        <div className="lg:col-span-1 print:hidden">
          <div className="sn-card sticky top-8">
            <h3 className="mb-4 border-b pb-2 text-lg font-bold text-slate-800">Saisir une journée</h3>
            {!canManage && (
              <div className="mb-4 rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">
                Vous pointez uniquement pour vous-même. La localisation GPS sera enregistrée avec votre pointage.
              </div>
            )}
            {geoError && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {geoError}
              </div>
            )}
            {errors.length > 0 && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ul className="list-disc pl-5">
                  {errors.map((er, idx) => (
                    <li key={idx}>{er}</li>
                  ))}
                </ul>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Employé</label>
                <select
                  className="w-full rounded border bg-slate-50 p-2 font-medium"
                  value={form.userId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, userId: event.target.value }))
                  }
                  disabled={ownOnly}
                >
                  {employees.length === 0 ? (
                    <option value="">Aucun collaborateur disponible</option>
                  ) : (
                    employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Date</label>
                <input
                  type="date"
                  className="w-full rounded border p-2"
                  value={form.date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, date: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Début</label>
                  <input
                    type="time"
                    className="w-full rounded border p-2"
                    value={form.start}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, start: event.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Fin</label>
                  <input
                    type="time"
                    className="w-full rounded border p-2"
                    value={form.end}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, end: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Pause (HH:mm)</label>
                <input
                  type="time"
                  className="w-full rounded border p-2"
                  value={form.breakTime}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, breakTime: event.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Note (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Remplacement..."
                  className="w-full rounded border p-2"
                  value={form.note}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, note: event.target.value }))
                  }
                />
              </div>

              <button
                type="submit"
                disabled={geoPending}
                className="sn-btn-primary w-full disabled:cursor-wait disabled:bg-slate-300"
              >
                {geoPending ? 'Obtention de la position…' : 'Enregistrer le pointage'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sn-card overflow-hidden print:border-none print:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4 print:border-black print:bg-white">
              <h3 className="text-lg font-bold text-slate-700">Rapport d&apos;Heures - {currentMonth}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="text-xs font-bold bg-white border px-3 py-1 rounded hover:bg-slate-100 print:hidden"
                >
                  🖨️ Imprimer
                </button>
                <button
                  onClick={exportCSV}
                  className="text-xs font-bold bg-white border px-3 py-1 rounded hover:bg-slate-100 print:hidden"
                >
                  ⬇️ Export CSV
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Calcul en cours...</div>
            ) : (
              <div className="p-4 space-y-8">
                {report.map((entry) => {
                  const lastName = entry.user.lastName ? entry.user.lastName.toUpperCase() : ''
                  const isOpen = openUsers[entry.user.id] ?? false
                  return (
                    <div
                      key={entry.user.id}
                      className="mb-6 break-inside-avoid overflow-hidden rounded-lg border print:border-black"
                    >
                      <div className="flex items-center justify-between bg-slate-100 p-3 print:bg-slate-200">
                        <button
                          onClick={() => toggleUser(entry.user.id)}
                          className="flex items-center gap-2 font-bold text-slate-900"
                        >
                          <span className="inline-block w-4 text-center">
                            {isOpen ? '▾' : '▸'}
                          </span>
                          {entry.user.firstName} {lastName}
                        </button>
                        <div className="text-sm">
                          <span className="mr-2 text-slate-500">{entry.shiftsCount} jours</span>
                          <span className="rounded bg-blue-600 px-2 py-1 font-bold text-white print:border print:border-black print:bg-white print:text-black">
                            Total : {entry.totalHours} h
                          </span>
                        </div>
                      </div>

                      {isOpen && (
                        <table className="w-full text-left text-sm">
                          <thead className="border-b bg-slate-50 text-xs font-normal uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <tr>
                              <th className="p-2 pl-4">Date</th>
                              <th className="p-2">Horaires</th>
                              <th className="p-2">Pause</th>
                              <th className="p-2 pr-4 text-right">Total Net</th>
                              {canManage && <th className="p-2 pr-4 text-right">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {entry.details.length === 0 ? (
                              <tr>
                                <td colSpan={canManage ? 5 : 4} className="p-4 text-center italic text-slate-400">
                                  Aucune heure saisie ce mois-ci.
                                </td>
                              </tr>
                            ) : (
                              (() => {
                                const groupedByDay = entry.details
                                  .slice()
                                  .sort(
                                    (a, b) =>
                                      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                                  )
                                  .reduce<Record<string, ShiftDetail[]>>((acc, shift) => {
                                    const key = formatWallDate(shift.startTime)
                                    if (!acc[key]) acc[key] = []
                                    acc[key].push(shift)
                                    return acc
                                  }, {})

                                return Object.entries(groupedByDay).map(([day, dayShifts]) => {
                                  const rowsForDay = dayShifts.map((shift) => {
                                    const rawMinutes =
                                      (new Date(shift.endTime).getTime() -
                                        new Date(shift.startTime).getTime()) / 60000
                                    const breakMinutes = Math.max(0, shift.breakMinutes)
                                    const netMinutes = Math.max(0, rawMinutes - breakMinutes)
                                    return {
                                      shift,
                                      netMinutes,
                                      netHours: (netMinutes / 60).toFixed(2)
                                    }
                                  })
                                  const dayTotalHours = (
                                    rowsForDay.reduce((sum, row) => sum + row.netMinutes, 0) / 60
                                  ).toFixed(2)

                                  return (
                                    <Fragment key={day}>
                                      {rowsForDay.map(({ shift, netHours }) => {
                                        const breakMinutes = Math.max(0, shift.breakMinutes)
                                        const breakHours = Math.floor(breakMinutes / 60)
                                        const breakRemainder = String(breakMinutes % 60).padStart(2, '0')
                                        return (
                                          <tr key={shift.id}>
                                            <td className="p-2 pl-4 font-medium">{day}</td>
                                            <td className="p-2 text-slate-600">
                                              {formatWallTime(shift.startTime)} - {formatWallTime(shift.endTime)}
                                              {typeof shift.clockLatitude === 'number' && Number.isFinite(shift.clockLatitude) &&
                                                typeof shift.clockLongitude === 'number' && Number.isFinite(shift.clockLongitude) && (
                                                  <div className="mt-1 text-[11px] text-slate-400">
                                                    <a
                                                      href={`https://maps.google.com/?q=${shift.clockLatitude},${shift.clockLongitude}`}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="hover:underline underline-offset-2"
                                                    >
                                                      📍 {shift.clockLatitude.toFixed(4)}, {shift.clockLongitude.toFixed(4)}
                                                    </a>
                                                    {typeof shift.clockAccuracy === 'number' && Number.isFinite(shift.clockAccuracy) && (
                                                      <span> • ±{Math.round(shift.clockAccuracy)} m</span>
                                                    )}
                                                  </div>
                                                )}
                                            </td>
                                            <td className="p-2 italic text-slate-500">
                                              {breakMinutes > 0 ? `-${breakHours}h${breakRemainder}` : '-'}
                                            </td>
                                            <td className="p-2 pr-4 text-right font-bold text-slate-700">
                                              {netHours} h
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
                                        )
                                      })}
                                      <tr>
                                        <td className="p-2 pl-4 font-bold text-slate-700">Total jour</td>
                                        <td className="p-2 text-slate-600" colSpan={2}></td>
                                        <td className="p-2 pr-4 text-right font-bold text-blue-700">
                                          {dayTotalHours} h
                                        </td>
                                        {canManage && <td />}
                                      </tr>
                                    </Fragment>
                                  )
                                })
                              })()
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingShift && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-bold">Modifier le shift</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Date</label>
                <input
                  type="date"
                  className="w-full rounded border p-2"
                  value={editingShift.date}
                  onChange={(event) =>
                    setEditingShift((prev) => (prev ? { ...prev, date: event.target.value } : prev))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Début</label>
                  <input
                    type="time"
                    className="w-full rounded border p-2"
                    value={editingShift.start}
                    onChange={(event) =>
                      setEditingShift((prev) => (prev ? { ...prev, start: event.target.value } : prev))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Fin</label>
                  <input
                    type="time"
                    className="w-full rounded border p-2"
                    value={editingShift.end}
                    onChange={(event) =>
                      setEditingShift((prev) => (prev ? { ...prev, end: event.target.value } : prev))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Pause (HH:mm)</label>
                <input
                  type="time"
                  className="w-full rounded border p-2"
                  value={editingShift.breakTime}
                  onChange={(event) =>
                    setEditingShift((prev) => (prev ? { ...prev, breakTime: event.target.value } : prev))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Note</label>
                <input
                  type="text"
                  className="w-full rounded border p-2"
                  value={editingShift.note}
                  onChange={(event) =>
                    setEditingShift((prev) => (prev ? { ...prev, note: event.target.value } : prev))
                  }
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between gap-2">
              <button
                onClick={() => deleteShift(editingShift)}
                className="rounded border border-red-300 px-3 py-2 text-red-700 hover:bg-red-50"
              >
                Supprimer
              </button>
              <div className="flex gap-2">
                <button onClick={cancelEdit} className="rounded border px-3 py-2">
                  Annuler
                </button>
                <button onClick={submitEdit} className="rounded bg-blue-600 px-3 py-2 text-white">
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
