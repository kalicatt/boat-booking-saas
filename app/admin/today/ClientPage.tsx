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
import { MobileTimeline, type MobileTimelineGroup } from '../_components/MobileTimeline'
import { getBoatTheme } from '../_components/boatThemes'
import { BookingDetailsModal } from '../_components/BookingDetailsModal'
import {
  type BookingDetails,
  type PaymentMarkState,
  type BoardingStatus,
  type AdminBookingDto
} from '../_components/bookingTypes'

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
  capacity: number | null
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

type FleetBoatAlert = {
  batteryAlert: 'OK' | 'WARNING' | 'CRITICAL'
  status: string
  daysSinceCharge: number
  batteryCycleDays: number
  mechanicalAlert: boolean
}

interface BoatResource {
  id: number
  title: string
  capacity: number
}

interface BoatApiRow {
  id?: unknown
  title?: unknown
  name?: unknown
  capacity?: unknown
}

interface PaymentMethodPayload {
  provider: string
  methodType?: string
  amountReceived?: number
  changeDue?: number
}

interface BookingUpdatePayload {
  newCheckinStatus?: BoardingStatus
  newIsPaid?: boolean
  paymentMethod?: PaymentMethodPayload
}

const DEFAULT_BOAT_CAPACITY = 12

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
            name: typeof boatRecord.name === 'string' ? (boatRecord.name as string) : null,
            capacity: typeof boatRecord.capacity === 'number' ? boatRecord.capacity : null
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

const buildBookingDetails = (booking: AdminBookingDto, loadMap: Record<string, number>): BookingDetails => {
  const rawStart = new Date(booking.startTime)
  const rawEnd = new Date(booking.endTime)
  const startWall = new Date(
    rawStart.getUTCFullYear(),
    rawStart.getUTCMonth(),
    rawStart.getUTCDate(),
    rawStart.getUTCHours(),
    rawStart.getUTCMinutes()
  )
  const endWall = new Date(
    rawEnd.getUTCFullYear(),
    rawEnd.getUTCMonth(),
    rawEnd.getUTCDate(),
    rawEnd.getUTCHours(),
    rawEnd.getUTCMinutes()
  )

  const firstName = booking.user?.firstName ?? ''
  const lastName = booking.user?.lastName ?? ''
  const clientFullName = `${firstName} ${lastName}`.trim() || 'Client'
  const displayTitle = clientFullName === 'Client Guichet' ? 'Guichet' : clientFullName

  const normalizedStatus = booking.status === 'CANCELLED'
    ? 'CANCELLED'
    : booking.status === 'CONFIRMED'
      ? 'CONFIRMED'
      : 'PENDING'

  const normalizedCheckin: BoardingStatus = booking.checkinStatus === 'NO_SHOW'
    ? 'NO_SHOW'
    : booking.checkinStatus === 'EMBARQUED'
      ? 'EMBARQUED'
      : 'CONFIRMED'

  const normalizedPayments = Array.isArray(booking.payments)
    ? booking.payments.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        methodType: payment.methodType ?? null,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: String(payment.createdAt)
      }))
    : []

  const totalPrice =
    typeof booking.totalPrice === 'number' && Number.isFinite(booking.totalPrice)
      ? booking.totalPrice
      : null

  return {
    id: booking.id,
    title: displayTitle,
    start: startWall,
    end: endWall,
    resourceId: Number(booking.boatId ?? 0),
    clientName: clientFullName,
    peopleCount: Number(booking.numberOfPeople ?? 0),
    adults: Number(booking.adults ?? 0),
    children: Number(booking.children ?? 0),
    babies: Number(booking.babies ?? 0),
    boatCapacity: Number(booking.boat?.capacity ?? 0),
    totalOnBoat: loadMap[`${booking.startTime}_${booking.boatId ?? 'boat'}`] ?? 0,
    user: {
      firstName: firstName || 'Client',
      lastName: lastName || '',
      email: booking.user?.email ?? '',
      phone: booking.user?.phone ?? '',
      role: booking.user?.role ?? 'CLIENT'
    },
    language: booking.language ?? 'FR',
    totalPrice,
    checkinStatus: normalizedCheckin,
    isPaid: Boolean(booking.isPaid),
    status: normalizedStatus,
    message: booking.message ?? '',
    payments: normalizedPayments.length > 0 ? normalizedPayments : undefined
  }
}

export default function ClientPage() {
  const [bookings, setBookings] = useState<TodayBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalPeople: 0, count: 0 })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [resources, setResources] = useState<BoatResource[]>([])
  const bookingDetailsRef = useRef<Map<string, BookingDetails>>(new Map())
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsGroup, setDetailsGroup] = useState<BookingDetails[]>([])
  const [detailsGroupIndex, setDetailsGroupIndex] = useState(0)
  const [detailsMarkPaid, setDetailsMarkPaid] = useState<PaymentMarkState>(null)
  const [detailsPaymentSelectorOpen, setDetailsPaymentSelectorOpen] = useState(false)
  const openDetailsPaymentSelector = useCallback(() => setDetailsPaymentSelectorOpen(true), [])
  const closeDetailsPaymentSelector = useCallback(() => {
    setDetailsPaymentSelectorOpen(false)
    setDetailsMarkPaid(null)
  }, [])
  const [fleetAlerts, setFleetAlerts] = useState<Record<number, FleetBoatAlert>>({})
  const selectedBookingRef = useRef<BookingDetails | null>(null)
  const detailsGroupRef = useRef<BookingDetails[]>([])
  const detailsGroupIndexRef = useRef(0)
  const isNative = useIsNativePlatform()
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'submitting' | 'success' | 'error'>('idle')
  const [scanMessage, setScanMessage] = useState('')
  const scanResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelScanRef = useRef<(() => Promise<void>) | null>(null)
  const cancelledByUserRef = useRef(false)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const [completionLoading, setCompletionLoading] = useState<string | null>(null)
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

  useEffect(() => {
    selectedBookingRef.current = selectedBooking
  }, [selectedBooking])

  useEffect(() => {
    detailsGroupRef.current = detailsGroup
  }, [detailsGroup])

  useEffect(() => {
    detailsGroupIndexRef.current = detailsGroupIndex
  }, [detailsGroupIndex])

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
      if (!Array.isArray(payload)) {
        bookingDetailsRef.current = new Map()
        setBookings([])
        setStats({ totalPeople: 0, count: 0 })
        return
      }

      const rawList = payload as AdminBookingDto[]
      const parsed = parseTodayBookings(rawList)
      const sortedData = [...parsed].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      setBookings(sortedData)
      const people = sortedData.reduce((acc, booking) => acc + booking.numberOfPeople, 0)
      setStats({ totalPeople: people, count: sortedData.length })

      const loadMap = rawList.reduce<Record<string, number>>((accumulator, booking) => {
        const boatKey = `${booking.startTime}_${booking.boatId ?? 'boat'}`
        const pax = Number(booking.numberOfPeople ?? 0)
        accumulator[boatKey] = (accumulator[boatKey] || 0) + (Number.isFinite(pax) ? pax : 0)
        return accumulator
      }, {})

      const detailsMap = new Map<string, BookingDetails>()
      rawList.forEach((booking) => {
        const detail = buildBookingDetails(booking, loadMap)
        detailsMap.set(detail.id, detail)
      })
      bookingDetailsRef.current = detailsMap
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sn-sync', { detail: { source: 'today' } }))
      }

      if (rawList.length > 0) {
        setResources((prev) => {
          const map = new Map(prev.map((item) => [item.id, item] as const))
          rawList.forEach((booking) => {
            const boatId = typeof booking.boatId === 'number' ? booking.boatId : Number(booking.boatId ?? 0)
            if (!Number.isFinite(boatId) || boatId <= 0) return
            const capacity =
              typeof booking.boat?.capacity === 'number' && Number.isFinite(booking.boat.capacity)
                ? booking.boat.capacity
                : DEFAULT_BOAT_CAPACITY
            if (!map.has(boatId)) {
              map.set(boatId, { id: boatId, title: `Barque ${boatId}`, capacity })
            } else {
              const existing = map.get(boatId)
              if (existing && (!existing.capacity || existing.capacity === 0)) {
                map.set(boatId, { ...existing, capacity })
              }
            }
          })
          return Array.from(map.values())
        })
      }

      const currentSelection = selectedBookingRef.current
      if (currentSelection) {
        const updatedSelection = detailsMap.get(currentSelection.id)
        if (updatedSelection) {
          setSelectedBooking(updatedSelection)
        }
      }

      const currentGroup = detailsGroupRef.current
      if (currentGroup.length > 0) {
        const updatedGroup = currentGroup
          .map((item) => detailsMap.get(item.id))
          .filter((item): item is BookingDetails => Boolean(item))

        if (updatedGroup.length === 0) {
          setShowDetailsModal(false)
          setSelectedBooking(null)
          setDetailsGroup([])
          setDetailsGroupIndex(0)
        } else {
          setDetailsGroup(updatedGroup)
          const currentIndex = Math.min(detailsGroupIndexRef.current, updatedGroup.length - 1)
          if (currentIndex !== detailsGroupIndexRef.current) {
            setDetailsGroupIndex(currentIndex)
          }
          const selected = selectedBookingRef.current
          if (selected) {
            const refreshed = detailsMap.get(selected.id)
            if (refreshed) {
              setSelectedBooking(refreshed)
            }
          }
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(msg)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  const fetchBoatResources = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/boats')
      if (!response.ok) return
      const data: unknown = await response.json()
      if (!Array.isArray(data)) return

      const parseNumber = (value: unknown) => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
        if (typeof value === 'string') {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : NaN
        }
        return NaN
      }

      const normalized = data
        .map((item): BoatResource | null => {
          if (!item || typeof item !== 'object') return null
          const candidate = item as BoatApiRow
          const parsedId = parseNumber(candidate.id)
          if (!Number.isFinite(parsedId)) return null
          const rawTitle =
            typeof candidate.title === 'string' && candidate.title.trim().length
              ? candidate.title.trim()
              : typeof candidate.name === 'string' && candidate.name.trim().length
                ? candidate.name.trim()
                : null
          const parsedCapacity = parseNumber(candidate.capacity)
          const capacity =
            Number.isFinite(parsedCapacity) && parsedCapacity > 0
              ? Math.round(parsedCapacity)
              : DEFAULT_BOAT_CAPACITY
          return {
            id: parsedId,
            title: rawTitle ?? `Barque ${parsedId}`,
            capacity
          }
        })
        .filter((boat): boat is BoatResource => boat !== null)

      if (normalized.length > 0) {
        setResources((prev) => {
          const map = new Map<number, BoatResource>()
          normalized.forEach((boat) => {
            map.set(boat.id, boat)
          })
          prev.forEach((boat) => {
            if (!map.has(boat.id)) {
              map.set(boat.id, boat)
            }
          })
          return Array.from(map.values())
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Erreur chargement barques', message)
    }
  }, [])

  const fetchFleetAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/fleet')
      if (!response.ok) return
      const payload: unknown = await response.json()
      if (!payload || typeof payload !== 'object') return
      const boats = Array.isArray((payload as { boats?: unknown }).boats)
        ? ((payload as { boats?: unknown }).boats as unknown[])
        : null
      if (!boats) return

      const normalizeNumber = (value: unknown) => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
        if (typeof value === 'string' && value.trim().length) {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : NaN
        }
        return NaN
      }

      const alerts = boats.reduce<Record<number, FleetBoatAlert>>((accumulator, raw) => {
        if (!raw || typeof raw !== 'object') return accumulator
        const boat = raw as Record<string, unknown>
        const idValue = boat.id
        const numericId = normalizeNumber(idValue)
        if (!Number.isFinite(numericId)) return accumulator
        const daysSinceCharge = normalizeNumber(boat.daysSinceCharge)
        const batteryCycleDays = normalizeNumber(boat.batteryCycleDays)
        const batteryAlert =
          boat.batteryAlert === 'WARNING' || boat.batteryAlert === 'CRITICAL' ? boat.batteryAlert : 'OK'
        const status = typeof boat.status === 'string' ? boat.status : 'ACTIVE'
        const mechanicalAlert = Boolean(boat.mechanicalAlert)
        accumulator[numericId] = {
          batteryAlert,
          status,
          daysSinceCharge: Number.isFinite(daysSinceCharge) ? daysSinceCharge : 0,
          batteryCycleDays: Number.isFinite(batteryCycleDays) ? batteryCycleDays : 0,
          mechanicalAlert
        }
        return accumulator
      }, {})

      setFleetAlerts(alerts)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Erreur chargement fleet', message)
    }
  }, [])

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

  useEffect(() => {
    void fetchBoatResources()
  }, [fetchBoatResources])

  useEffect(() => {
    void fetchFleetAlerts()
  }, [fetchFleetAlerts])

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
        <span className="sn-pill sn-pill--emerald">
          <span className="sn-pill__dot" aria-hidden="true" />
          Embarqué
        </span>
      )
    }
    if (checkinStatus === 'NO_SHOW') {
      return (
        <span className="sn-pill sn-pill--rose">
          <span className="sn-pill__dot" aria-hidden="true" />
          No-show
        </span>
      )
    }
    if (status === 'CONFIRMED') {
      return (
        <span className="sn-pill sn-pill--blue">
          <span className="sn-pill__dot" aria-hidden="true" />
          Confirmé
        </span>
      )
    }
    if (status === 'CANCELLED') {
      return (
        <span className="sn-pill sn-pill--rose">
          <span className="sn-pill__dot" aria-hidden="true" />
          Annulé
        </span>
      )
    }
    return (
      <span className="sn-pill sn-pill--outline">
        <span className="sn-pill__dot" aria-hidden="true" />
        {status ?? 'En attente'}
      </span>
    )
  }

  const getBoatAlertDescriptors = (alert?: FleetBoatAlert | null) => {
    if (!alert) return []
    const descriptors: Array<{ key: string; label: string; tone: 'rose' | 'amber' }> = []
    if (alert.status === 'MAINTENANCE') {
      descriptors.push({ key: 'status', label: 'Maintenance', tone: 'rose' })
    }
    if (alert.batteryAlert === 'CRITICAL') {
      descriptors.push({ key: 'battery-critical', label: 'Batterie critique', tone: 'rose' })
    } else if (alert.batteryAlert === 'WARNING') {
      descriptors.push({
        key: 'battery-warning',
        label: `Batterie J+${alert.daysSinceCharge}/${alert.batteryCycleDays || '??'}`,
        tone: 'amber'
      })
    }
    if (alert.mechanicalAlert) {
      descriptors.push({ key: 'mechanical', label: 'Révision requise', tone: 'amber' })
    }
    return descriptors
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

  const handleCompleteBooking = useCallback(
    async (bookingId: string) => {
      if (!bookingId) return
      setCompletionLoading(bookingId)
      try {
        const response = await fetch(`/api/bookings/${bookingId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? 'Finalisation impossible.')
        }

        await fetchBookings()
        await fetchFleetAlerts()
        setSelectedBooking((previous) => {
          if (!previous || previous.id !== bookingId) return previous
          return { ...previous, status: 'COMPLETED' }
        })
        setDetailsGroup((previous) =>
          previous.map((detail) => (detail.id === bookingId ? { ...detail, status: 'COMPLETED' } : detail))
        )
        showActionFeedback('success', 'Sortie complétée. Compteurs mis à jour.')
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Finalisation impossible.'
        console.error(message)
        showActionFeedback('error', message)
      } finally {
        setCompletionLoading(null)
      }
    },
    [fetchBookings, fetchFleetAlerts, showActionFeedback]
  )

  const openBookingDetails = useCallback(
    (bookingId: string, groupItems: TodayBooking[], itemIndex: number) => {
      const map = bookingDetailsRef.current
      const selected = map.get(bookingId)
      if (!selected) return

      const groupDetails = groupItems
        .map((item) => map.get(item.id))
        .filter((detail): detail is BookingDetails => Boolean(detail))

      const finalGroup = groupDetails.length > 0 ? groupDetails : [selected]
      const inferredIndex = groupDetails.findIndex((detail) => detail.id === selected.id)
      const nextIndex = inferredIndex >= 0 ? inferredIndex : Math.min(itemIndex, finalGroup.length - 1)

      setDetailsGroup(finalGroup)
      setDetailsGroupIndex(nextIndex)
      setSelectedBooking(selected)
      closeDetailsPaymentSelector()
      setShowDetailsModal(true)
    },
    [closeDetailsPaymentSelector]
  )

  const closeDetailsModal = useCallback(() => {
    setShowDetailsModal(false)
    setSelectedBooking(null)
    setDetailsGroup([])
    setDetailsGroupIndex(0)
    closeDetailsPaymentSelector()
  }, [closeDetailsPaymentSelector])

  const navigateDetailsBooking = useCallback(
    (direction: 'prev' | 'next') => {
      setDetailsGroupIndex((currentIndex) => {
        const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
        const target = detailsGroupRef.current[nextIndex]
        if (!target) return currentIndex
        setSelectedBooking(target)
        closeDetailsPaymentSelector()
        return nextIndex
      })
    },
    [closeDetailsPaymentSelector]
  )

  const handleModalStatusUpdate = useCallback(
    async (id: string, newCheckinStatus?: BoardingStatus, newIsPaid?: boolean) => {
      const body: BookingUpdatePayload = {}
      if (newCheckinStatus) body.newCheckinStatus = newCheckinStatus
      if (newIsPaid !== undefined) body.newIsPaid = newIsPaid

      const rawCashValue = detailsMarkPaid?.provider === 'cash' ? detailsMarkPaid.cashGiven ?? '' : ''
      const parsedCashValue = rawCashValue ? Number.parseFloat(rawCashValue) : Number.NaN
      const hasCashAmount = detailsMarkPaid?.provider === 'cash' && !Number.isNaN(parsedCashValue)
      const normalizedCashValue = hasCashAmount ? Number(parsedCashValue.toFixed(2)) : undefined
      const basePrice = selectedBookingRef.current?.totalPrice

      if (newIsPaid === true && detailsMarkPaid?.provider) {
        body.paymentMethod = {
          provider: detailsMarkPaid.provider,
          methodType: detailsMarkPaid.provider === 'voucher' ? detailsMarkPaid.methodType : undefined,
          amountReceived: normalizedCashValue,
          changeDue:
            normalizedCashValue !== undefined && typeof basePrice === 'number'
              ? Number((normalizedCashValue - basePrice).toFixed(2))
              : undefined
        }
      }

      try {
        const response = await fetch(`/api/bookings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          throw new Error('Mise à jour impossible.')
        }

        setSelectedBooking((previous) => {
          if (!previous || previous.id !== id) return previous
          return {
            ...previous,
            checkinStatus: newCheckinStatus ?? previous.checkinStatus,
            isPaid: newIsPaid !== undefined ? newIsPaid : previous.isPaid
          }
        })
        setDetailsGroup((previous) =>
          previous.map((detail) =>
            detail.id === id
              ? {
                  ...detail,
                  checkinStatus: newCheckinStatus ?? detail.checkinStatus,
                  isPaid: newIsPaid !== undefined ? newIsPaid : detail.isPaid
                }
              : detail
          )
        )

        closeDetailsPaymentSelector()
        await fetchBookings()
        if (isNative) {
          showActionFeedback('success', 'Réservation mise à jour.')
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Action impossible.'
        if (isNative) {
          showActionFeedback('error', message)
        } else {
          alert(message)
        }
      }
    },
    [closeDetailsPaymentSelector, detailsMarkPaid, fetchBookings, isNative, showActionFeedback]
  )

  const handleEditTime = useCallback(
    (booking: BookingDetails) => {
      void (async () => {
        try {
          const defaultTime = format(booking.start, 'HH:mm')
          const input = prompt('Nouvelle heure (HH:mm)', defaultTime) || ''
          const match = input.trim().match(/^(\d{1,2}):(\d{2})$/)
          if (!match) return
          const hours = Number.parseInt(match[1], 10)
          const minutes = Number.parseInt(match[2], 10)
          if (
            Number.isNaN(hours) ||
            Number.isNaN(minutes) ||
            hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59
          ) {
            return
          }

          const wallStart = new Date(booking.start)
          wallStart.setHours(hours, minutes, 0, 0)
          const utcStart = new Date(
            Date.UTC(wallStart.getFullYear(), wallStart.getMonth(), wallStart.getDate(), hours, minutes, 0)
          )

          const response = await fetch(`/api/bookings/${booking.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start: utcStart.toISOString() })
          })

          if (!response.ok) {
            alert("Échec de la mise à jour de l'heure")
            return
          }

          setSelectedBooking((previous) => (
            previous && previous.id === booking.id
              ? { ...previous, start: wallStart }
              : previous
          ))
          setDetailsGroup((previous) =>
            previous.map((detail) => (detail.id === booking.id ? { ...detail, start: wallStart } : detail))
          )
          await fetchBookings()
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(message)
        }
      })()
    },
    [fetchBookings]
  )

  const handleDelete = useCallback(
    (id: string, title: string) => {
      void (async () => {
        if (!confirm(`ANNULER la réservation de ${title} ?`)) return
        try {
          const response = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
          if (!response.ok) {
            throw new Error('Suppression impossible.')
          }
          await fetchBookings()
          closeDetailsModal()
          if (isNative) {
            showActionFeedback('success', 'Réservation supprimée.')
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Suppression impossible.'
          if (isNative) {
            showActionFeedback('error', message)
          } else {
            alert(message)
          }
        }
      })()
    },
    [closeDetailsModal, fetchBookings, isNative, showActionFeedback]
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
              const resource = b.boatId !== null ? resources.find((boat) => boat.id === b.boatId) : undefined
              const boatLabel = resource?.title ?? b.boat?.name ?? '—'
              const boatAlert = b.boatId !== null ? fleetAlerts[b.boatId] : undefined
              const boatAlertBadges = getBoatAlertDescriptors(boatAlert)
              const groupItems = bookings.filter((candidate) =>
                toWallClock(candidate.startTime).getTime() === toWallClock(b.startTime).getTime()
              )
              const groupIndex = Math.max(
                groupItems.findIndex((candidate) => candidate.id === b.id),
                0
              )

              return (
                <tr
                  key={`${b.id}-${index}`}
                  className="hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => openBookingDetails(b.id, groupItems, groupIndex)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openBookingDetails(b.id, groupItems, groupIndex)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
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
                      {boatLabel}
                    </span>
                    {boatAlertBadges.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 text-[11px] font-semibold">
                        {boatAlertBadges.map((badge) => (
                          <span
                            key={`${b.id}-${badge.key}`}
                            className={`sn-pill ${badge.tone === 'rose' ? 'sn-pill--rose' : 'sn-pill--amber'}`}
                          >
                            <span className="sn-pill__dot" aria-hidden="true" />
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    )}
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

    const grouped: Array<{ wallDate: Date; items: TodayBooking[] }> = []
    let currentKey: string | null = null
    bookings.forEach((booking) => {
      const wallDate = toWallClock(booking.startTime)
      const key = wallDate.toISOString()
      if (currentKey && key === currentKey) {
        grouped[grouped.length - 1].items.push(booking)
      } else {
        grouped.push({ wallDate, items: [booking] })
        currentKey = key
      }
    })

    const timelineGroups: MobileTimelineGroup<TodayBooking>[] = grouped.map((group, groupIndex) => {
      const representative = group.items[0]
      const loadEntries: Array<{
        key: string
        label: string
        total: number
        capacity: number
        themeClass: string
      }> = []

      group.items.forEach((booking) => {
        const boatKey = booking.boatId !== null ? `boat-${booking.boatId}` : `boat-${booking.boat?.name ?? 'unknown'}`
        let entry = loadEntries.find((item) => item.key === boatKey)
        const resource = booking.boatId !== null ? resources.find((boat) => boat.id === booking.boatId) : undefined
        if (!entry) {
          entry = {
            key: boatKey,
            label: resource?.title ?? booking.boat?.name ?? 'Barque ?',
            total: 0,
            capacity: resource?.capacity ?? booking.boat?.capacity ?? DEFAULT_BOAT_CAPACITY,
            themeClass: getBoatTheme(booking.boatId).badge
          }
          loadEntries.push(entry)
        }
        entry.total += booking.numberOfPeople
        if (!entry.capacity || entry.capacity <= 0) {
          entry.capacity = resource?.capacity ?? booking.boat?.capacity ?? DEFAULT_BOAT_CAPACITY
        }
      })

      return {
        id: `${representative.startTime}-${groupIndex}`,
        slotTime: group.wallDate,
        items: group.items,
        indicatorClass: getBoatTheme(representative.boatId).indicator,
        loadSummary: loadEntries.map((entry) => ({
          key: entry.key,
          label: entry.label,
          total: entry.total,
          capacity: entry.capacity,
          badgeClass: entry.themeClass
        }))
      }
    })

    return (
      <MobileTimeline
        groups={timelineGroups}
        locale={fr}
        renderDateSeparator={({ group, prevGroup }) => {
          if (viewMode === 'day') return null
          if (!prevGroup || !isSameDay(group.slotTime, prevGroup.slotTime)) {
            const first = group.items[0]
            return (
              <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {formatDateLabel(first.startTime)}
              </div>
            )
          }
          return null
        }}
        shouldConnectToNext={({ group, nextGroup }) => Boolean(nextGroup && isSameDay(group.slotTime, nextGroup.slotTime))}
        getItemKey={(booking) => booking.id}
        renderCard={(booking, context) => {
          const theme = getBoatTheme(booking.boatId)
          const isBusy = statusLoading === booking.id
          const isEmbarqued = booking.checkinStatus === 'EMBARQUED'
          const isNoShow = booking.checkinStatus === 'NO_SHOW'
          const completionBusy = completionLoading === booking.id
          const canCall = Boolean(booking.user.phone && booking.user.phone.trim().length > 0)
          const canEmail = Boolean(booking.user.email && booking.user.email.trim().length > 0)
          const resource = booking.boatId !== null ? resources.find((boat) => boat.id === booking.boatId) : undefined
          const boatLabel = resource?.title ?? booking.boat?.name ?? 'Barque ?'
          const boatAlert = booking.boatId !== null ? fleetAlerts[booking.boatId] : undefined
          const boatAlertBadges = getBoatAlertDescriptors(boatAlert)

          return (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openBookingDetails(booking.id, context.group.items, context.itemIndex)
                }
              }}
              onClick={() => openBookingDetails(booking.id, context.group.items, context.itemIndex)}
              className="snap-center min-w-[82vw] flex-shrink-0 cursor-pointer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">{`${booking.user.firstName ?? ''} ${booking.user.lastName ?? ''}`.trim() || 'Client inconnu'}</div>
                  <div className="mt-0.5 text-xs uppercase tracking-widest text-slate-400">
                    {booking.language ?? '—'}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Départ {formatTimeLabel(booking.startTime)}
                  </div>
                  {viewMode !== 'day' && (
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {formatShortDateLabel(booking.startTime)}
                    </div>
                  )}
                </div>
                {renderStatusBadge(booking.status, booking.checkinStatus)}
              </div>
              <div className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${theme.badge}`}>
                    {boatLabel}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${theme.pax}`}>
                    {booking.numberOfPeople} pax
                  </span>
                </div>
                {boatAlertBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
                    {boatAlertBadges.map((badge) => (
                      <span
                        key={`${booking.id}-${badge.key}`}
                        className={`sn-pill ${badge.tone === 'rose' ? 'sn-pill--rose' : 'sn-pill--amber'}`}
                      >
                        <span className="sn-pill__dot" aria-hidden="true" />
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">📞 {booking.user.phone ?? 'Non renseigné'}</span>
                  <span>{booking.user.email ?? '—'}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                {canCall && (
                  <a
                    href={`tel:${booking.user.phone}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-white shadow-sm transition active:scale-95"
                  >
                    <span aria-hidden="true">📞</span>
                    Appeler
                  </a>
                )}
                {canEmail && (
                  <a
                    href={`mailto:${booking.user.email}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700 shadow-sm transition active:scale-95"
                  >
                    <span aria-hidden="true">✉</span>
                    Email
                  </a>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleQuickStatusChange(booking.id, 'EMBARQUED')
                  }}
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
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleQuickStatusChange(booking.id, 'NO_SHOW')
                  }}
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
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleCompleteBooking(booking.id)
                  }}
                  disabled={completionBusy}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 shadow-sm transition ${
                    completionBusy
                      ? 'bg-slate-400 text-white'
                      : 'bg-slate-900 text-white active:scale-95'
                  }`}
                >
                  <span aria-hidden="true">🛶</span>
                  {completionBusy ? 'Finalisation…' : 'Terminer'}
                </button>
              </div>
            </div>
          )
        }}
      />
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
          <TodayStatCard label="Réservations" value={stats.count} />
          <TodayStatCard label="Passagers total" value={stats.totalPeople} />
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

        {showDetailsModal && selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            resources={resources}
            detailsMarkPaid={detailsMarkPaid}
            setDetailsMarkPaid={setDetailsMarkPaid}
            boatAlert={
              typeof selectedBooking.resourceId === 'number'
                ? fleetAlerts[selectedBooking.resourceId] ?? null
                : null
            }
            onClose={closeDetailsModal}
            onNavigate={navigateDetailsBooking}
            hasPrev={detailsGroupIndex > 0}
            hasNext={detailsGroupIndex < detailsGroup.length - 1}
            groupIndex={detailsGroupIndex}
            groupTotal={detailsGroup.length}
            paymentSelectorOpen={detailsPaymentSelectorOpen}
            onPaymentSelectorOpen={openDetailsPaymentSelector}
            onPaymentSelectorClose={closeDetailsPaymentSelector}
            onStatusUpdate={handleModalStatusUpdate}
            onEditTime={handleEditTime}
            onDelete={handleDelete}
            onComplete={handleCompleteBooking}
            completionLoadingId={completionLoading}
          />
        )}

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

function TodayStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="sn-stat-card border border-slate-200 bg-white text-slate-900 shadow-sm">
      <span className="sn-stat-card__label text-slate-500">{label}</span>
      <span className="sn-stat-card__value">{value}</span>
    </div>
  )
}
