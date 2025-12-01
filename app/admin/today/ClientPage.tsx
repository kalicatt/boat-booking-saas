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
import { useIsNativePlatform } from '@/lib/useIsNativePlatform'

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
  const isNative = useIsNativePlatform()

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

  const formatTimeLabel = (iso: string) => format(new Date(iso), 'HH:mm')
  const formatDateLabel = (iso: string) => format(new Date(iso), 'EEEE d MMMM', { locale: fr })
  const formatShortDateLabel = (iso: string) => format(new Date(iso), 'dd/MM', { locale: fr })
  const renderStatusBadge = (status: string | null) => {
    if (status === 'CONFIRMED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
          <span aria-hidden="true">✔</span>
          Confirmé
        </span>
      )
    }
    if (status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-600">
          <span aria-hidden="true">✖</span>
          Annulé
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
        <span aria-hidden="true">•</span>
        {status ?? 'En attente'}
      </span>
    )
  }

  const renderDesktopTable = () => (
    <div className="sn-card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
          <tr>
            <th className="p-4">{viewMode === 'day' ? 'Heure' : 'Date & Heure'}</th>
            <th className="p-4">Barque</th>
            <th className="p-4">Client</th>
            <th className="p-4">Contact</th>
            <th className="p-4 text-center">Pax</th>
            <th className="p-4 text-right">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
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
                <tr key={`${b.id}-${index}`} className="hover:bg-slate-50 transition">
                  <td className="p-4 align-top">
                    <div className="font-bold text-blue-900 text-lg">{formatTimeLabel(b.startTime)}</div>
                    {viewMode !== 'day' && (
                      <div className="text-[10px] text-slate-400 font-normal">
                        {formatShortDateLabel(b.startTime)}
                      </div>
                    )}
                    {showDateSeparator && (
                      <div className="mt-2 text-[11px] uppercase tracking-widest text-slate-400">
                        {formatDateLabel(b.startTime)}
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        b.boatId === 1
                          ? 'bg-blue-100 text-blue-800'
                          : b.boatId === 2
                          ? 'bg-green-100 text-green-800'
                          : b.boatId === 3
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {b.boat?.name ?? '—'}
                    </span>
                  </td>
                  <td className="p-4 align-top">
                    <div className="font-medium">{`${b.user.firstName ?? ''} ${b.user.lastName ?? ''}`.trim() || '—'}</div>
                    <div className="text-xs uppercase text-slate-400">{b.language ?? '—'}</div>
                  </td>
                  <td className="p-4 align-top text-slate-600">
                    <div className="font-semibold">📞 {b.user.phone ?? 'Non renseigné'}</div>
                    <div className="text-xs text-slate-400">{b.user.email ?? '—'}</div>
                  </td>
                  <td className="p-4 align-top text-center font-bold text-slate-700">{b.numberOfPeople}</td>
                  <td className="p-4 align-top text-right">{renderStatusBadge(b.status)}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )

  const renderMobileList = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-10 text-sm font-semibold text-slate-500">Chargement en cours…</div>
      )
    }
    if (bookings.length === 0) {
      return (
        <div className="rounded-2xl bg-white p-6 text-center text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
          Aucun départ sur cette période.
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        {bookings.map((b, index) => {
          const showDateSeparator =
            viewMode !== 'day' && (index === 0 || !isSameDay(new Date(b.startTime), new Date(bookings[index - 1].startTime)))

          return (
            <div key={b.id} className="flex flex-col gap-2">
              {showDateSeparator && (
                <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {formatDateLabel(b.startTime)}
                </div>
              )}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900">{formatTimeLabel(b.startTime)}</div>
                    {viewMode !== 'day' && (
                      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        {formatShortDateLabel(b.startTime)}
                      </div>
                    )}
                  </div>
                  {renderStatusBadge(b.status)}
                </div>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{b.boat?.name ?? 'Barque ?'}</span>
                    <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                      {b.numberOfPeople} pax
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{`${b.user.firstName ?? ''} ${b.user.lastName ?? ''}`.trim() || 'Client inconnu'}</p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">{b.language ?? '—'}</p>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">📞 {b.user.phone ?? 'Non renseigné'}</span>
                    <span>{b.user.email ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const bookingsContent = isNative ? renderMobileList() : renderDesktopTable()
  const containerClass = isNative ? 'flex flex-1 flex-col gap-4 pb-safe' : 'min-h-screen bg-slate-50 p-8 sn-admin'
  const innerClass = isNative ? 'flex flex-1 flex-col gap-4' : 'max-w-6xl mx-auto'
  const headerWrapperClass = isNative ? 'flex flex-col gap-4' : 'mb-8 print:hidden'
  const statsGridClass = isNative ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 md:grid-cols-4 gap-4'
  const viewButtonClass = (mode: ViewMode) => {
    const base = `${isNative ? 'flex-1 text-center' : ''} px-3 py-1 text-sm rounded transition`
    const active = viewMode === mode ? 'bg-sky-100 text-sky-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
    return `${base} ${active}`.trim()
  }

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <div className={headerWrapperClass}>
          {!isNative && (
            <Link href="/admin" className="mb-4 inline-block text-sm text-slate-500 transition hover:text-sky-600">
              ← Retour Tableau de bord
            </Link>
          )}
          <div className={`flex flex-col gap-4 ${isNative ? '' : 'md:flex-row md:items-center md:justify-between'}`}>
            <div>
              <h1 className={`${isNative ? 'text-2xl' : 'text-3xl'} font-bold capitalize text-slate-900`}>{getPeriodTitle()} <span aria-hidden="true">🗓️</span></h1>
              <p className="mt-1 text-sm text-slate-500">
                Vue : {viewMode === 'day' ? 'Journalière' : viewMode === 'week' ? 'Hebdomadaire' : 'Mensuelle'}
              </p>
            </div>
            <div className={`flex flex-col gap-3 ${isNative ? '' : 'items-end'}`}>
              <div className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
                <button onClick={() => setViewMode('day')} className={viewButtonClass('day')}>
                  Jour
                </button>
                <button onClick={() => setViewMode('week')} className={viewButtonClass('week')}>
                  Semaine
                </button>
                <button onClick={() => setViewMode('month')} className={viewButtonClass('month')}>
                  Mois
                </button>
              </div>
              <div className={isNative ? 'grid grid-cols-3 gap-2' : 'flex items-center gap-2'}>
                <button
                  onClick={() => handleNavigate('prev')}
                  className={`${isNative ? 'rounded-xl bg-white py-2 text-sm font-semibold text-slate-600 shadow-sm' : 'rounded-md border px-3 py-1 shadow-sm transition hover:bg-slate-100'}`}
                >
                  ◀
                </button>
                <button
                  onClick={goToToday}
                  className={`${isNative ? 'rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white' : 'rounded-md border px-3 py-1 text-sm font-bold shadow-sm transition hover:bg-slate-100'}`}
                >
                  Aujourd&apos;hui
                </button>
                <button
                  onClick={() => handleNavigate('next')}
                  className={`${isNative ? 'rounded-xl bg-white py-2 text-sm font-semibold text-slate-600 shadow-sm' : 'rounded-md border px-3 py-1 shadow-sm transition hover:bg-slate-100'}`}
                >
                  ▶
                </button>
                {!isNative && (
                  <button
                    onClick={() => window.print()}
                    className="ml-2 rounded-md bg-slate-900 px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
                  >
                    🖨️ Imprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`${statsGridClass} ${isNative ? '' : 'mb-8 print:mb-4'}`}>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Réservations</div>
            <div className={`${isNative ? 'text-xl' : 'text-2xl'} font-bold text-slate-900`}>{stats.count}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Passagers Total</div>
            <div className={`${isNative ? 'text-xl' : 'text-2xl'} font-bold text-slate-900`}>{stats.totalPeople}</div>
          </div>
        </div>

        {bookingsContent}
      </div>
    </div>
  )
}
