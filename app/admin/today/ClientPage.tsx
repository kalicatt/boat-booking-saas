'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay
} from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

type ViewMode = 'day' | 'week' | 'month'

type TodayBookingUser = {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}

type TodayBookingBoat = {
  id: number | null
  name: string | null
}

type TodayBooking = {
  id: string
  startTime: string
  language: string | null
  numberOfPeople: number
  status: string | null
  boatId: number | null
  boat: TodayBookingBoat | null
  user: TodayBookingUser
}

const parseTodayBookings = (input: unknown): TodayBooking[] => {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null
      }

      const record = entry as Record<string, unknown>
      const id = typeof record.id === 'string' ? record.id : null
      const startTime = typeof record.startTime === 'string' ? record.startTime : null

      if (!id || !startTime) {
        return null
      }

      const boatRaw = record.boat
      const boatRecord = boatRaw && typeof boatRaw === 'object' ? (boatRaw as Record<string, unknown>) : null
      const boat: TodayBookingBoat | null = boatRecord
        ? {
            id: typeof boatRecord.id === 'number' ? boatRecord.id : null,
            name: typeof boatRecord.name === 'string' ? (boatRecord.name as string) : null
          }
        : null

      const userRaw = record.user
      const userBase = userRaw && typeof userRaw === 'object' ? (userRaw as Record<string, unknown>) : {}

      return {
        id,
        startTime,
        language: typeof record.language === 'string' ? record.language : null,
        numberOfPeople: typeof record.numberOfPeople === 'number' ? record.numberOfPeople : 0,
        status: typeof record.status === 'string' ? record.status : null,
        boatId: typeof record.boatId === 'number' ? record.boatId : boat?.id ?? null,
        boat,
        user: {
          firstName: typeof userBase.firstName === 'string' ? (userBase.firstName as string) : null,
          lastName: typeof userBase.lastName === 'string' ? (userBase.lastName as string) : null,
          email: typeof userBase.email === 'string' ? (userBase.email as string) : null,
          phone: typeof userBase.phone === 'string' ? (userBase.phone as string) : null
        }
      }
    })
    .filter((booking): booking is TodayBooking => booking !== null)
}

export default function ClientTodayList() {
  const [bookings, setBookings] = useState<TodayBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalPeople: 0, count: 0 })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')

  const dateRange = useMemo(() => {
    const now = currentDate
    switch (viewMode) {
      case 'week':
        return { start: startOfWeek(now, { locale: fr }), end: endOfWeek(now, { locale: fr }) }
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'day':
      default:
        return { start: startOfDay(now), end: endOfDay(now) }
    }
  }, [currentDate, viewMode])

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const { start, end } = dateRange

    try {
      const res = await fetch(
        `/api/admin/all-bookings?start=${start.toISOString()}&end=${end.toISOString()}&t=${Date.now()}`
      )
      if (!res.ok) {
        throw new Error(`Erreur de chargement ${res.status}`)
      }
      const payload: unknown = await res.json()
      const parsed = parseTodayBookings(payload)
      const sortedData = [...parsed].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      setBookings(sortedData)
      const people = sortedData.reduce((acc, booking) => acc + booking.numberOfPeople, 0)
      setStats({ totalPeople: people, count: sortedData.length })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(msg)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate((prev) => (direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)))
    } else if (viewMode === 'week') {
      setCurrentDate((prev) => (direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)))
    } else {
      setCurrentDate((prev) => (direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)))
    }
  }

  const goToToday = () => setCurrentDate(new Date())

  const getPeriodTitle = () => {
    if (viewMode === 'day') return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })
    if (viewMode === 'week') {
      return `Semaine du ${format(dateRange.start, 'd MMM')} au ${format(dateRange.end, 'd MMM yyyy', { locale: fr })}`
    }
    return format(currentDate, 'MMMM yyyy', { locale: fr })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 sn-admin">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 print:hidden">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-4 inline-block">
            ← Retour Tableau de bord
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 capitalize">{getPeriodTitle()} 🗓️</h1>
              <p className="text-slate-500 text-sm mt-1">
                Vue : {viewMode === 'day' ? 'Journalière' : viewMode === 'week' ? 'Hebdomadaire' : 'Mensuelle'}
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="bg-white rounded-lg shadow-sm border p-1 flex">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === 'day' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Jour
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === 'week' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Semaine
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === 'month' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Mois
                </button>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleNavigate('prev')} className="bg-white border px-3 py-1 rounded shadow-sm hover:bg-slate-50">
                  ◀
                </button>
                <button onClick={goToToday} className="bg-white border px-3 py-1 rounded shadow-sm hover:bg-slate-50 text-sm font-bold">
                  Aujourd&apos;hui
                </button>
                <button onClick={() => handleNavigate('next')} className="bg-white border px-3 py-1 rounded shadow-sm hover:bg-slate-50">
                  ▶
                </button>
                <button onClick={() => window.print()} className="ml-2 bg-slate-800 text-white px-3 py-1 rounded shadow-sm hover:bg-slate-700 text-sm">
                  🖨️ Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print:mb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="text-xs text-slate-500 uppercase font-bold">Réservations</div>
            <div className="text-2xl font-bold">{stats.count}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="text-xs text-slate-500 uppercase font-bold">Passagers Total</div>
            <div className="text-2xl font-bold">{stats.totalPeople}</div>
          </div>
        </div>

        <div className="sn-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              <tr>
                <th className="p-4">{viewMode === 'day' ? 'Heure' : 'Date & Heure'}</th>
                <th className="p-4">Barque</th>
                <th className="p-4">Client</th>
                <th className="p-4">Contact</th>
                <th className="p-4 text-center">Pax</th>
                <th className="p-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    Chargement...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Aucun départ sur cette période.
                  </td>
                </tr>
              ) : (
                bookings.map((b, index) => {
                  const showDateSeparator =
                    viewMode !== 'day' && (index === 0 || !isSameDay(new Date(b.startTime), new Date(bookings[index - 1].startTime)))

                  return (
                    <>
                      {showDateSeparator && (
                        <tr className="bg-slate-100 border-y border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          <td colSpan={6} className="px-4 py-2 font-bold text-slate-600 uppercase text-xs">
                            {format(new Date(b.startTime), 'EEEE d MMMM', { locale: fr })}
                          </td>
                        </tr>
                      )}
                      <tr key={b.id} className="hover:bg-slate-50 transition dark:hover:bg-slate-800">
                        <td className="p-4 font-bold text-blue-900 text-lg">
                          {(() => {
                            const d = new Date(b.startTime)
                            const hh = String(d.getUTCHours()).padStart(2, '0')
                            const mm = String(d.getUTCMinutes()).padStart(2, '0')
                            return `${hh}:${mm}`
                          })()}
                          {viewMode !== 'day' && (
                            <div className="text-[10px] text-slate-400 font-normal print:block hidden">
                              {(() => {
                                const d = new Date(b.startTime)
                                const y = d.getUTCFullYear()
                                const m = d.getUTCMonth()
                                const day = d.getUTCDate()
                                const wall = new Date(Date.UTC(y, m, day))
                                return format(wall, 'dd/MM')
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold 
                                ${b.boatId === 1 ? 'bg-blue-100 text-blue-800' : 
                                  b.boatId === 2 ? 'bg-green-100 text-green-800' :
                                  b.boatId === 3 ? 'bg-purple-100 text-purple-800' : 
                                  'bg-orange-100 text-orange-800'}`}
                          >
                            {b.boat?.name ?? '—'}
                          </span>
                        </td>
                        <td className="p-4 font-medium">
                          {(b.user.firstName ?? '')} {(b.user.lastName ?? '')}
                          <div className="text-xs text-slate-400 uppercase">{b.language ?? '—'}</div>
                        </td>
                        <td className="p-4 text-slate-600">
                          <div className="font-bold">📞 {b.user.phone ?? 'Non renseigné'}</div>
                          <div className="text-xs text-slate-400">{b.user.email ?? '—'}</div>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700">{b.numberOfPeople}</td>
                        <td className="p-4 text-right">
                          {b.status === 'CONFIRMED' && (
                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200 text-xs font-bold">
                              CONFIRMÉ
                            </span>
                          )}
                          {b.status === 'CANCELLED' && (
                            <span className="text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 text-xs font-bold">
                              ANNULÉ
                            </span>
                          )}
                        </td>
                      </tr>
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
