'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { Capacitor } from '@capacitor/core'
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { useIsNativePlatform } from '@/lib/useIsNativePlatform'

declare global {
  interface Window {
    ScannerOverlay?: {
      showOverlay: () => void
      hideOverlay: () => void
      hideWebView?: () => void
      showWebView?: () => void
    }
  }
}

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
  checkinStatus: string | null
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
        checkinStatus: typeof record.checkinStatus === 'string' ? record.checkinStatus : null,
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

export default function ClientPage() {
  const [bookings, setBookings] = useState<TodayBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalPeople: 0, count: 0 })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const isNative = useIsNativePlatform()
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'submitting' | 'success' | 'error'>('idle')
  const [scanMessage, setScanMessage] = useState('')
  const scanResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelScanRef = useRef<(() => Promise<void>) | null>(null)
  const cancelledByUserRef = useRef(false)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const actionFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const clearScanReset = useCallback(() => {
    if (scanResetTimer.current) {
      clearTimeout(scanResetTimer.current)
      scanResetTimer.current = null
    }
  }, [])

  const scheduleScanReset = useCallback(() => {
    clearScanReset()
    scanResetTimer.current = setTimeout(() => {
      setScanState('idle')
      setScanMessage('')
      if (typeof window !== 'undefined') {
        const overlayBridge = window.ScannerOverlay
        overlayBridge?.hideOverlay()
        if (overlayBridge?.showWebView) {
          overlayBridge.showWebView()
        }
      }
      scanResetTimer.current = null
    }, 2600)
  }, [clearScanReset])

  const showActionFeedback = useCallback((type: 'success' | 'error', message: string) => {
    if (actionFeedbackTimer.current) {
      clearTimeout(actionFeedbackTimer.current)
      actionFeedbackTimer.current = null
    }
    setActionFeedback({ type, message })
    actionFeedbackTimer.current = setTimeout(() => {
      setActionFeedback(null)
      actionFeedbackTimer.current = null
    }, 2600)
  }, [])

  const handleScanCancel = useCallback(async () => {
    if (scanState === 'idle') return
    cancelledByUserRef.current = true
    const cancelFn = cancelScanRef.current
    cancelScanRef.current = null
    if (cancelFn) {
      await cancelFn().catch(() => undefined)
    }
    await BarcodeScanner.stopScan().catch(() => undefined)
    if (typeof window !== 'undefined') {
      const overlayBridge = window.ScannerOverlay
      overlayBridge?.hideOverlay()
      if (overlayBridge?.showWebView) {
        overlayBridge.showWebView()
      }
    }
    clearScanReset()
    setScanState('idle')
    setScanMessage('')
  }, [scanState, clearScanReset])

  const ensureCameraPermission = useCallback(async () => {
    try {
      const status = await BarcodeScanner.checkPermissions()
      if (status.camera === 'granted') return true
      const request = await BarcodeScanner.requestPermissions()
      return request.camera === 'granted'
    } catch {
      return false
    }
  }, [])

  const handleScanPress = useCallback(async () => {
    if (!isNative) return

    if (!Capacitor.isPluginAvailable('BarcodeScanner')) {
      setScanState('error')
      setScanMessage('Scanner indisponible sur cet appareil.')
      scheduleScanReset()
      return
    }

    if (typeof BarcodeScanner.isSupported === 'function') {
      try {
        const { supported } = await BarcodeScanner.isSupported()
        if (!supported) {
          setScanState('error')
          setScanMessage('Scanner indisponible sur cet appareil.')
          scheduleScanReset()
          return
        }
      } catch {
        // ignore and attempt scan
      }
    }

    const granted = await ensureCameraPermission()
    if (!granted) {
      setScanState('error')
      setScanMessage("Autorisez l'accès à la caméra pour scanner.")
      scheduleScanReset()
      return
    }

    try {
      setScanState('scanning')
      setScanMessage('Scannez un QR code…')
      if (typeof window !== 'undefined') {
        const overlayBridge = window.ScannerOverlay
        overlayBridge?.showOverlay()
        if (overlayBridge?.hideWebView) {
          overlayBridge.hideWebView()
        }
      }

      let readyResolver: (() => void) | null = null
      let listenersSetupSuccessful = false
      const listenersReady = new Promise<void>((resolve) => {
        readyResolver = resolve
      })

      const barcodeRawValuePromise = new Promise<string>(async (resolve, reject) => {
        let settled = false
        let cleanup: (() => Promise<void>) | null = null

        const finishSuccess = async (value: string) => {
          if (settled) return
          settled = true
          if (cleanup) {
            await cleanup().catch(() => undefined)
          }
          cancelScanRef.current = null
          resolve(value)
        }

        const finishError = async (error: Error) => {
          if (settled) return
          settled = true
          if (cleanup) {
            await cleanup().catch(() => undefined)
          }
          cancelScanRef.current = null
          reject(error)
        }

        cancelScanRef.current = async () => {
          await finishError(new Error('Scan annulé.'))
        }

        try {
          const barcodeHandle = await BarcodeScanner.addListener(
            'barcodesScanned',
            (event: { barcodes?: Array<{ rawValue?: string | null }> }) => {
              const candidate = event?.barcodes?.find(
                (item) => typeof item?.rawValue === 'string' && item.rawValue.length > 0
              )
              if (!candidate?.rawValue) {
                return
              }
              void finishSuccess(candidate.rawValue)
            }
          )

          const addAnyListener = BarcodeScanner.addListener as unknown as (
            eventName: string,
            listenerFunc: (event: unknown) => void
          ) => Promise<{ remove: () => Promise<void> }>

          const errorHandle = await addAnyListener('scanError', (event) => {
            const errorEvent = event as { error?: string }
            const message =
              typeof errorEvent?.error === 'string' && errorEvent.error.trim().length > 0
                ? errorEvent.error
                : 'Scan interrompu.'
            void finishError(new Error(message))
          })

          cleanup = async () => {
            await Promise.all([barcodeHandle.remove(), errorHandle.remove()])
          }
          listenersSetupSuccessful = true
        } catch (listenerError: unknown) {
          const message = listenerError instanceof Error ? listenerError.message : 'Initialisation du scanner impossible.'
          await finishError(new Error(message))
        } finally {
          readyResolver?.()
        }
      })

      await listenersReady
      if (!listenersSetupSuccessful) {
        throw new Error('Initialisation du scanner impossible.')
      }
      await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode] })

      const rawValue = await barcodeRawValuePromise

      let bookingId: string | null = null
      try {
        const parsed = JSON.parse(rawValue) as { type?: string; bookingId?: unknown }
        if (parsed?.type === 'booking' && typeof parsed.bookingId === 'string') {
          bookingId = parsed.bookingId
        }
      } catch {
        // ignore parsing error
      }

      if (!bookingId) {
        throw new Error('QR code non reconnu.')
      }

      await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined)

      setScanState('submitting')
      setScanMessage('Validation en cours…')

      const response = await fetch(`/api/bookings/${bookingId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EMBARQUED' })
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'Validation impossible.')
      }

      await fetchBookings()
      await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined)

      setScanState('success')
      setScanMessage('Embarquement validé ✅')
      scheduleScanReset()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Scan impossible.'
      const wasCancelled = cancelledByUserRef.current && message === 'Scan annulé.'
      if (wasCancelled) {
        cancelledByUserRef.current = false
        setScanState('idle')
        setScanMessage('')
        clearScanReset()
      } else {
        await Haptics.notification({ type: NotificationType.Error }).catch(() => undefined)
        setScanState('error')
        setScanMessage(message)
        scheduleScanReset()
      }
    } finally {
      cancelScanRef.current = null
      cancelledByUserRef.current = false
      await BarcodeScanner.stopScan().catch(() => undefined)
      if (typeof window !== 'undefined') {
        const overlayBridge = window.ScannerOverlay
        overlayBridge?.hideOverlay()
        if (overlayBridge?.showWebView) {
          overlayBridge.showWebView()
        }
      }
    }
  }, [isNative, ensureCameraPermission, fetchBookings, scheduleScanReset, clearScanReset])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  useEffect(() => {
    return () => {
      clearScanReset()
      if (typeof window !== 'undefined') {
        const overlayBridge = window.ScannerOverlay
        overlayBridge?.hideOverlay()
        if (overlayBridge?.showWebView) {
          overlayBridge.showWebView()
        }
      }
      if (actionFeedbackTimer.current) {
        clearTimeout(actionFeedbackTimer.current)
        actionFeedbackTimer.current = null
      }
    }
  }, [clearScanReset])

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

  const toWallClock = (iso: string): Date => {
    const instant = new Date(iso)
    return new Date(
      Date.UTC(
        instant.getUTCFullYear(),
        instant.getUTCMonth(),
        instant.getUTCDate(),
        instant.getUTCHours(),
        instant.getUTCMinutes(),
        0,
        0
      )
    )
  }
  const formatTimeLabel = (iso: string) => format(toWallClock(iso), 'HH:mm')
  const formatDateLabel = (iso: string) => format(toWallClock(iso), 'EEEE d MMMM', { locale: fr })
  const formatShortDateLabel = (iso: string) => format(toWallClock(iso), 'dd/MM', { locale: fr })
  const renderStatusBadge = (status: string | null, checkinStatus: string | null) => {
    if (checkinStatus === 'EMBARQUED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
          <span aria-hidden="true">✅</span>
          Embarqué
        </span>
      )
    }
    if (checkinStatus === 'NO_SHOW') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700">
          <span aria-hidden="true">⚠</span>
          No-show
        </span>
      )
    }
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

  const getBoatTheme = (boatId: number | null) => {
    switch (boatId) {
      case 1:
        return {
          badge: 'bg-blue-100 text-blue-800',
          indicator: 'border-blue-400 text-blue-900 shadow-[0_0_0_3px_rgba(147,197,253,0.35)]',
          pax: 'bg-blue-600 text-white'
        }
      case 2:
        return {
          badge: 'bg-emerald-100 text-emerald-700',
          indicator: 'border-emerald-400 text-emerald-900 shadow-[0_0_0_3px_rgba(134,239,172,0.35)]',
          pax: 'bg-emerald-600 text-white'
        }
      case 3:
        return {
          badge: 'bg-purple-100 text-purple-800',
          indicator: 'border-purple-400 text-purple-900 shadow-[0_0_0_3px_rgba(216,180,254,0.35)]',
          pax: 'bg-purple-600 text-white'
        }
      default:
        return {
          badge: 'bg-orange-100 text-orange-800',
          indicator: 'border-orange-400 text-orange-900 shadow-[0_0_0_3px_rgba(253,186,116,0.35)]',
          pax: 'bg-orange-500 text-white'
        }
    }
  }

  const handleQuickStatusChange = useCallback(
    async (bookingId: string, nextStatus: 'EMBARQUED' | 'NO_SHOW') => {
      setStatusLoading(bookingId)
      try {
        const response = await fetch(`/api/bookings/${bookingId}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? 'Action impossible.')
        }

        await fetchBookings()
        if (isNative) {
          const hapticsType = nextStatus === 'EMBARQUED' ? NotificationType.Success : NotificationType.Warning
          await Haptics.notification({ type: hapticsType }).catch(() => undefined)
        }
        const successMessage = nextStatus === 'EMBARQUED' ? 'Embarquement validé.' : 'Passager marqué absent.'
        showActionFeedback('success', successMessage)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Action impossible.'
        console.error(message)
        if (isNative) {
          await Haptics.notification({ type: NotificationType.Error }).catch(() => undefined)
        }
        showActionFeedback('error', message)
      } finally {
        setStatusLoading(null)
      }
    },
    [fetchBookings, isNative, showActionFeedback]
  )

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
                viewMode !== 'day' &&
                (index === 0 || !isSameDay(toWallClock(b.startTime), toWallClock(bookings[index - 1].startTime)))
              const theme = getBoatTheme(b.boatId)

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
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${theme.badge}`}>
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
                  <td className="p-4 align-top text-right">{renderStatusBadge(b.status, b.checkinStatus)}</td>
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
      <div className="flex flex-col gap-5">
        {bookings.map((b, index) => {
          const showDateSeparator =
            viewMode !== 'day' &&
            (index === 0 || !isSameDay(toWallClock(b.startTime), toWallClock(bookings[index - 1].startTime)))
          const nextBooking = index < bookings.length - 1 ? bookings[index + 1] : null
          const connectToNext = nextBooking
            ? isSameDay(toWallClock(b.startTime), toWallClock(nextBooking.startTime))
            : false
          const theme = getBoatTheme(b.boatId)
          const isBusy = statusLoading === b.id
          const isEmbarqued = b.checkinStatus === 'EMBARQUED'
          const isNoShow = b.checkinStatus === 'NO_SHOW'
          const canCall = Boolean(b.user.phone && b.user.phone.trim().length > 0)
          const canEmail = Boolean(b.user.email && b.user.email.trim().length > 0)

          return (
            <div key={`${b.id}-${index}`} className="relative">
              {showDateSeparator && (
                <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {formatDateLabel(b.startTime)}
                </div>
              )}
              <div className="relative pl-16">
                {connectToNext && (
                  <span aria-hidden="true" className="absolute left-6 top-16 h-20 w-px bg-slate-200" />
                )}
                <div
                  aria-hidden="true"
                  className={`absolute left-0 top-4 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white text-[0.8rem] font-black uppercase leading-none ${theme.indicator}`}
                >
                  {formatTimeLabel(b.startTime)}
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-extrabold text-slate-900">{`${b.user.firstName ?? ''} ${b.user.lastName ?? ''}`.trim() || 'Client inconnu'}</div>
                      <div className="mt-0.5 text-xs uppercase tracking-widest text-slate-400">
                        {b.language ?? '—'}
                      </div>
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Départ {formatTimeLabel(b.startTime)}
                      </div>
                      {viewMode !== 'day' && (
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {formatShortDateLabel(b.startTime)}
                        </div>
                      )}
                    </div>
                    {renderStatusBadge(b.status, b.checkinStatus)}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${theme.badge}`}>
                        {b.boat?.name ?? 'Barque ?'}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${theme.pax}`}>
                        {b.numberOfPeople} pax
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">📞 {b.user.phone ?? 'Non renseigné'}</span>
                      <span>{b.user.email ?? '—'}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    {canCall && (
                      <a
                        href={`tel:${b.user.phone}`}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-white shadow-sm transition active:scale-95"
                      >
                        <span aria-hidden="true">📞</span>
                        Appeler
                      </a>
                    )}
                    {canEmail && (
                      <a
                        href={`mailto:${b.user.email}`}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700 shadow-sm transition active:scale-95"
                      >
                        <span aria-hidden="true">✉</span>
                        Email
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(b.id, 'EMBARQUED')}
                      disabled={isBusy || isEmbarqued}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 shadow-sm transition ${
                        isEmbarqued
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-emerald-500 text-white active:scale-95 disabled:bg-emerald-400 disabled:opacity-90'
                      }`}
                    >
                      <span aria-hidden="true">✅</span>
                      {isBusy && !isEmbarqued ? 'Patientez…' : isEmbarqued ? 'Embarqué' : 'Check-in'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(b.id, 'NO_SHOW')}
                      disabled={isBusy || isNoShow}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 shadow-sm transition ${
                        isNoShow
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-rose-500 text-white active:scale-95 disabled:bg-rose-400 disabled:opacity-90'
                      }`}
                    >
                      <span aria-hidden="true">⚠</span>
                      {isBusy && !isNoShow ? 'Patientez…' : isNoShow ? 'No-show' : 'Absent'}
                    </button>
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
  const isScanBusy = scanState === 'scanning' || scanState === 'submitting'

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

        {isNative && actionFeedback && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm ${
              actionFeedback.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          >
            {actionFeedback.message}
          </div>
        )}

        {bookingsContent}

        {isNative && (
          <>
            {(scanState === 'scanning' || scanState === 'submitting') && (
              <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center gap-10 bg-slate-900/45 pb-20 pt-32 text-white">
                <button
                  type="button"
                  onClick={handleScanCancel}
                  disabled={scanState === 'submitting'}
                  className="pointer-events-auto absolute top-10 right-6 rounded-full border border-white/40 bg-slate-900/50 px-4 py-1 text-xl font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-slate-900/70 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Fermer le scan"
                >
                  ×
                </button>
                <div className="flex w-full flex-1 items-center justify-center">
                  <div className="relative flex h-60 w-60 max-w-[70%] items-center justify-center rounded-[2rem] border-4 border-white/80 shadow-[0_0_50px_rgba(15,23,42,0.55)]">
                    <div className="absolute inset-4 rounded-[1.5rem] border border-white/35" />
                    <div className="absolute inset-x-0 bottom-4 mx-auto h-1 w-20 rounded-full bg-white/70" />
                  </div>
                </div>
                <p className="px-10 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white/90">
                  Centrez le QR code dans le cadre
                </p>
              </div>
            )}
            {scanState !== 'idle' && scanMessage && (
              <div
                className={`fixed bottom-28 left-1/2 z-40 w-[90%] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-sm font-semibold text-white shadow-xl ${
                  scanState === 'success'
                    ? 'bg-emerald-500'
                    : scanState === 'error'
                    ? 'bg-rose-500'
                    : 'bg-slate-900/90'
                }`}
              >
                {scanMessage}
              </div>
            )}
            <button
              type="button"
              onClick={handleScanPress}
              disabled={isScanBusy}
              className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-xl transition active:scale-95 disabled:cursor-not-allowed disabled:bg-sky-400"
            >
              <span aria-hidden="true">📷</span>
              {isScanBusy ? 'Scan en cours…' : 'Scan & Go'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
