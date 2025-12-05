'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode, FC } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import type { ResourceHeaderProps } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay, isSameMinute, addDays, parseISO, subMinutes, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logout } from '@/lib/actions'
import QuickBookingModal from '@/components/QuickBookingModal'
import useSWR from 'swr'
import { AdminPageShell } from '../_components/AdminPageShell'
import { MobileTimeline, type MobileTimelineGroup } from '../_components/MobileTimeline'
import { getBoatTheme } from '../_components/boatThemes'
import { useIsNativePlatform } from '@/lib/useIsNativePlatform'
import { BookingDetailsModal } from '../_components/BookingDetailsModal'
import { parseParisWallDate } from '@/lib/time'
import {
  STATUS_THEME,
  LANGUAGE_FLAGS,
  type BoardingStatus,
  type BookingStatus,
  type BookingPaymentDto,
  type BookingDetails,
  type PaymentMarkState,
  type AdminBookingDto
} from '../_components/bookingTypes'

const locales = { 'fr': fr }
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales
})

interface BoatResource { id: number; title: string; capacity: number }

interface ClosureSummary {
  id: string
  day: string
  locked: boolean
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

type CalendarResource = BoatResource | { id?: number | string } | number | string | null | undefined

type PlanningPreset = 'standard' | 'morning' | 'afternoon'

interface BoatApiRow {
  id?: unknown
  title?: unknown
  name?: unknown
  capacity?: unknown
}

interface SlotSelectionInfo {
  start: Date
  end: Date
  resourceId?: CalendarResource
}

interface PlanningTimeSlotWrapperProps {
  children?: ReactNode
  value?: Date | string | number
  resource?: CalendarResource
}

type PassengerKind = 'adult' | 'child' | 'baby' | 'passenger'

interface SeatOccupant {
  id: string
  label: string
  type: PassengerKind
  bookingId: string
  shortLabel: string
}

interface SeatPlanBench {
  benchIndex: number
  seats: Array<{ seatIndex: number; occupant: SeatOccupant | null }>
}

interface SeatPlanResult {
  benches: SeatPlanBench[]
  error?: string
}

interface BoatPlanModalState {
  boat: { id: number; title: string; capacity: number }
  departure: Date
  bookings: BookingDetails[]
}

interface BoatDailyStat {
  id: number
  title: string
  capacity: number
  passengers: number
  bookings: number
  peakLoad: number
  loadPct: number
  nextSlot: BookingDetails | null
  nextRemaining: number | null
}

const BOAT_BENCH_COUNT = 4
const BOAT_SEATS_PER_BENCH = 3
const BOAT_COLOR_PALETTE = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#6366f1', '#fb7185']
const OPEN_TIME_MINUTES = 10 * 60
const SLOT_INTERVAL_MINUTES = 10

const buildWallUtcDate = (dateLabel: string, timeLabel: string) => {
  const [yearStr, monthStr, dayStr] = dateLabel.split('-')
  const [hourStr, minuteStr] = timeLabel.split(':')
  const year = Number.parseInt(yearStr ?? '', 10)
  const monthRaw = Number.parseInt(monthStr ?? '', 10)
  const day = Number.parseInt(dayStr ?? '', 10)
  const hour = Number.parseInt(hourStr ?? '', 10)
  const minute = Number.parseInt(minuteStr ?? '', 10)
  const safeYear = Number.isFinite(year) ? year : 1970
  const safeMonth = Number.isFinite(monthRaw) ? Math.max(0, monthRaw - 1) : 0
  const safeDay = Number.isFinite(day) ? Math.max(1, day) : 1
  const safeHour = Number.isFinite(hour) ? hour : 0
  const safeMinute = Number.isFinite(minute) ? minute : 0
  return new Date(Date.UTC(safeYear, safeMonth, safeDay, safeHour, safeMinute, 0, 0))
}

const buildOccupantsForBooking = (booking: BookingDetails): SeatOccupant[] => {
  const occupants: SeatOccupant[] = []
  const base = booking.clientName || 'Passager'
  const safeAdults = Math.max(0, booking.adults || 0)
  const safeChildren = Math.max(0, booking.children || 0)
  const safeBabies = Math.max(0, booking.babies || 0)

  for (let i = 0; i < safeChildren; i += 1) {
    occupants.push({
      id: `${booking.id}-child-${i}`,
      label: `${base} • Enfant ${i + 1}`,
      type: 'child',
      bookingId: booking.id,
      shortLabel: `E${i + 1}`
    })
  }

  for (let i = 0; i < safeBabies; i += 1) {
    occupants.push({
      id: `${booking.id}-baby-${i}`,
      label: `${base} • Bébé ${i + 1}`,
      type: 'baby',
      bookingId: booking.id,
      shortLabel: `B${i + 1}`
    })
  }

  for (let i = 0; i < safeAdults; i += 1) {
    occupants.push({
      id: `${booking.id}-adult-${i}`,
      label: `${base} • Adulte ${i + 1}`,
      type: 'adult',
      bookingId: booking.id,
      shortLabel: `A${i + 1}`
    })
  }

  const declared = safeAdults + safeChildren + safeBabies
  const remainder = Math.max(0, (booking.peopleCount || 0) - declared)
  for (let i = 0; i < remainder; i += 1) {
    occupants.push({
      id: `${booking.id}-passenger-${i}`,
      label: `${base} • Passager ${i + 1}`,
      type: 'passenger',
      bookingId: booking.id,
      shortLabel: `P${i + 1}`
    })
  }

  return occupants
}

const deriveInitialStatus = (booking: BookingDetails): BoardingStatus => {
  if (booking.checkinStatus === 'NO_SHOW') return 'NO_SHOW'
  if (booking.checkinStatus === 'EMBARQUED') return 'EMBARQUED'
  return 'CONFIRMED'
}

const computeSeatPlan = (
  bookings: BookingDetails[],
  statuses: Record<string, BoardingStatus>
): SeatPlanResult => {
  const benches: SeatPlanBench[] = Array.from({ length: BOAT_BENCH_COUNT }, (_, benchIndex) => ({
    benchIndex,
    seats: Array.from({ length: BOAT_SEATS_PER_BENCH }, (_, seatIndex) => ({ seatIndex, occupant: null as SeatOccupant | null }))
  }))

  const limit = BOAT_BENCH_COUNT * BOAT_SEATS_PER_BENCH

  const groups = bookings
    .filter((booking) => statuses[booking.id] !== 'NO_SHOW')
    .map((booking) => ({
      booking,
      childScore: Math.max(0, (booking.children || 0) + (booking.babies || 0)),
      occupants: buildOccupantsForBooking(booking)
    }))
    .filter((group) => group.occupants.length > 0)
    .sort((a, b) => {
      if (b.childScore !== a.childScore) return b.childScore - a.childScore
      const diff = (b.booking.peopleCount || 0) - (a.booking.peopleCount || 0)
      if (diff !== 0) return diff
      return (a.booking.clientName || '').localeCompare(b.booking.clientName || '')
    })

  let cursor = 0

  for (const group of groups) {
    if (cursor + group.occupants.length > limit) {
      return {
        benches,
        error: "Impossible de générer automatiquement le plan : capacité dépassée (override détecté)."
      }
    }

    group.occupants.forEach((occupant) => {
      const benchIndex = Math.floor(cursor / BOAT_SEATS_PER_BENCH)
      const seatIndex = cursor % BOAT_SEATS_PER_BENCH
      benches[benchIndex].seats[seatIndex] = { seatIndex, occupant }
      cursor += 1
    })
  }

  return { benches }
}

const jsonFetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Erreur fetch')
  return response.json() as Promise<T>
}

export default function ClientPlanningPage({ canOverrideLockedDays }: { canOverrideLockedDays: boolean }) {
  const [resources, setResources] = useState<BoatResource[]>([])
  const [loadingBoats, setLoadingBoats] = useState(true)
  const [preset, setPreset] = useState<PlanningPreset>('standard')
  const [zoomLevel, setZoomLevel] = useState(1)
  const containerRef = useRef<HTMLDivElement|null>(null)
  const clampZoom = useCallback((value: number) => Number(Math.min(2, Math.max(0.5, value)).toFixed(2)), [])

  useEffect(()=>{
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        e.stopPropagation()
        const delta = e.deltaY
        setZoomLevel(prev => {
          const step = delta > 0 ? -0.1 : 0.1
          return clampZoom(prev + step)
        })
      }
    }
    const onGestureStart: EventListener = (event) => {
      // Safari/iOS specific pinch gesture
      event.preventDefault()
      event.stopPropagation()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', onGestureStart, { passive: false })
    return ()=>{
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', onGestureStart)
    }
  }, [clampZoom])

  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()))
  const [currentRange, setCurrentRange] = useState({ start: startOfDay(new Date()), end: endOfDay(new Date()) })

  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsMarkPaid, setDetailsMarkPaid] = useState<PaymentMarkState>(null)
  const [detailsPaymentSelectorOpen, setDetailsPaymentSelectorOpen] = useState(false)
  const openDetailsPaymentSelector = useCallback(() => setDetailsPaymentSelectorOpen(true), [])
  const closeDetailsPaymentSelector = useCallback(() => {
    setDetailsPaymentSelectorOpen(false)
    setDetailsMarkPaid(null)
  }, [])
  const [detailsGroup, setDetailsGroup] = useState<BookingDetails[]>([])
  const [detailsGroupIndex, setDetailsGroupIndex] = useState(0)
  const [completionLoading, setCompletionLoading] = useState<string | null>(null)

  const [selectedSlotDetails, setSelectedSlotDetails] = useState<{ start: Date; boatId: number } | null>(null)
  const [showQuickBookModal, setShowQuickBookModal] = useState(false)
  const [boatPlanModal, setBoatPlanModal] = useState<BoatPlanModalState | null>(null)
  const isNative = useIsNativePlatform()

  const calendarMin = useMemo(() => {
    if (preset === 'morning') return new Date(0, 0, 0, 9, 30, 0)
    if (preset === 'afternoon') return new Date(0, 0, 0, 13, 0, 0)
    return new Date(0, 0, 0, 10, 0, 0)
  }, [preset])

  const calendarMax = useMemo(() => {
    if (preset === 'morning') return new Date(0, 0, 0, 12, 30, 0)
    if (preset === 'afternoon') return new Date(0, 0, 0, 20, 0, 0)
    return new Date(0, 0, 0, 18, 30, 0)
  }, [preset])

  const timeGridStyle = useMemo<CSSProperties>(() => {
    const slotHeight = Math.round(40 * zoomLevel)
    return { '--slotH': `${slotHeight}px` } as CSSProperties
  }, [zoomLevel])

  const apiUrl = `/api/admin/all-bookings?start=${currentRange.start.toISOString()}&end=${currentRange.end.toISOString()}`

  const { data: rawBookings, error, mutate } = useSWR<AdminBookingDto[]>(apiUrl, jsonFetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    keepPreviousData: true
  })
  const { data: closures } = useSWR<ClosureSummary[]>(
    canOverrideLockedDays ? null : '/api/admin/closures',
    jsonFetcher
  )

  const isLockedDate = useCallback((target: Date) => {
    if (canOverrideLockedDays) return false
    if (!Array.isArray(closures)) return false
    const targetDay = format(target, 'yyyy-MM-dd')
    return closures.some((closure) =>
      closure.locked && format(new Date(closure.day), 'yyyy-MM-dd') === targetDay
    )
  }, [closures, canOverrideLockedDays])

  const events = useMemo<BookingDetails[]>(() => {
    if (!Array.isArray(rawBookings)) return []

    const loadMap = rawBookings.reduce<Record<string, number>>((accumulator, booking) => {
      const key = `${booking.startTime}_${booking.boatId}`
      const peopleCount = Number(booking.numberOfPeople ?? 0)
      accumulator[key] = (accumulator[key] || 0) + peopleCount
      return accumulator
    }, {})

    return rawBookings.reduce<BookingDetails[]>((accumulator, booking) => {
      const visualStart = new Date(booking.startTime)
      if (Number.isNaN(visualStart.getTime())) return accumulator

      const visualEnd = new Date(booking.endTime)
      const startWall = new Date(
        visualStart.getFullYear(),
        visualStart.getMonth(),
        visualStart.getDate(),
        visualStart.getHours(),
        visualStart.getMinutes()
      )
      const endWall = new Date(
        visualEnd.getFullYear(),
        visualEnd.getMonth(),
        visualEnd.getDate(),
        visualEnd.getHours(),
        visualEnd.getMinutes()
      )

      const firstName = booking.user?.firstName ?? ''
      const lastName = booking.user?.lastName ?? ''
      const clientFullName = `${firstName} ${lastName}`.trim() || 'Client'
      const displayTitle = clientFullName === 'Client Guichet' ? 'Guichet' : clientFullName

      const normalizedStatus: BookingStatus = booking.status === 'CANCELLED'
        ? 'CANCELLED'
        : booking.status === 'CONFIRMED'
          ? 'CONFIRMED'
          : 'PENDING'
      const normalizedCheckin: BoardingStatus = booking.checkinStatus === 'NO_SHOW'
        ? 'NO_SHOW'
        : booking.checkinStatus === 'EMBARQUED'
          ? 'EMBARQUED'
          : 'CONFIRMED'

      const normalizedPayments: BookingPaymentDto[] = (booking.payments ?? []).map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        methodType: payment.methodType ?? null,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: String(payment.createdAt)
      }))
      const payments = normalizedPayments.length ? normalizedPayments : undefined
      const totalPrice = typeof booking.totalPrice === 'number' && Number.isFinite(booking.totalPrice)
        ? booking.totalPrice
        : null

      accumulator.push({
        id: booking.id,
        title: displayTitle,
        start: startWall,
        end: endWall,
        resourceId: Number(booking.boatId),
        peopleCount: Number(booking.numberOfPeople ?? 0),
        adults: Number(booking.adults ?? 0),
        children: Number(booking.children ?? 0),
        babies: Number(booking.babies ?? 0),
        boatCapacity: Number(booking.boat?.capacity ?? 0),
        totalOnBoat: loadMap[`${booking.startTime}_${booking.boatId}`] ?? 0,
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
        clientName: clientFullName,
        message: booking.message ?? null,
        payments
      })

      return accumulator
    }, [])
  }, [rawBookings])

  const resourceMap = useMemo(() => {
    const map = new Map<number, BoatResource>()
    resources.forEach((resource) => {
      map.set(resource.id, resource)
    })
    return map
  }, [resources])

  const dayBookings = useMemo(() => {
    return events.filter((event) => isSameDay(event.start, currentDate))
  }, [events, currentDate])

  const dayEvents = useMemo(() => {
    return [...dayBookings].sort((a, b) => {
      const timeDiff = a.start.getTime() - b.start.getTime()
      if (timeDiff !== 0) return timeDiff
      return Number(a.resourceId || 0) - Number(b.resourceId || 0)
    })
  }, [dayBookings])

  const getRotationBoatId = useCallback((wallHour: number, wallMinute: number) => {
    if (!resources.length) return null
    const minutesTotal = wallHour * 60 + wallMinute
    const slotsElapsedRaw = (minutesTotal - OPEN_TIME_MINUTES) / SLOT_INTERVAL_MINUTES
    if (!Number.isFinite(slotsElapsedRaw)) return resources[0]?.id ?? null
    const slotsElapsed = Math.floor(slotsElapsedRaw)
    const index = ((slotsElapsed % resources.length) + resources.length) % resources.length
    return resources[index]?.id ?? null
  }, [resources])

  const resolveBoatIdForSlot = useCallback((wallHour: number, wallMinute: number, resourceHint?: CalendarResource) => {
    if (typeof resourceHint === 'number' && Number.isFinite(resourceHint)) {
      return resourceHint
    }
    if (typeof resourceHint === 'string') {
      const parsed = Number(resourceHint)
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed
    }
    if (resourceHint && typeof resourceHint === 'object' && 'id' in resourceHint) {
      const parsed = Number(resourceHint.id)
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed
    }
    return getRotationBoatId(wallHour, wallMinute) ?? resources[0]?.id ?? 1
  }, [getRotationBoatId, resources])

  const boatDailyStats = useMemo<BoatDailyStat[]>(() => {
    if (!resources.length) return []

    const now = new Date()
    const graceThreshold = subMinutes(now, 12)

    return resources.map((resource) => {
      const todaysEvents = events.filter(
        (event) => event.resourceId === resource.id && isSameDay(event.start, currentDate)
      )

      const passengers = todaysEvents.reduce((sum, event) => sum + (event.peopleCount || 0), 0)
      const bookings = todaysEvents.length
      const peakLoad = todaysEvents.reduce(
        (max, event) => Math.max(max, event.totalOnBoat ?? event.peopleCount ?? 0),
        0
      )
      const upcoming = todaysEvents
        .filter((event) => event.start.getTime() >= graceThreshold.getTime())
        .sort((a, b) => a.start.getTime() - b.start.getTime())
      const nextSlot = upcoming[0] ?? null
      const nextRemaining = nextSlot
        ? Math.max((resource.capacity || 0) - (nextSlot.totalOnBoat ?? nextSlot.peopleCount ?? 0), 0)
        : null
      const loadPct = resource.capacity ? Math.min(peakLoad / resource.capacity, 1) : 0

      return {
        id: resource.id,
        title: resource.title,
        capacity: resource.capacity,
        passengers,
        bookings,
        peakLoad,
        loadPct,
        nextSlot,
        nextRemaining
      }
    })
  }, [resources, events, currentDate])

  const statusSummary = useMemo(() => {
    const summaryMap = new Map<
      string,
      { key: string; label: string; count: number; theme: (typeof STATUS_THEME)['DEFAULT'] }
    >()

    events.forEach((event) => {
      if (!isSameDay(event.start, currentDate)) return
      const key = event.checkinStatus || event.status || 'DEFAULT'
      const theme = STATUS_THEME[key] ?? STATUS_THEME.DEFAULT
      const current = summaryMap.get(key)
      if (current) {
        summaryMap.set(key, { ...current, count: current.count + 1 })
      } else {
        summaryMap.set(key, { key, label: theme.label, count: 1, theme })
      }
    })

    return Array.from(summaryMap.values()).sort((a, b) => b.count - a.count)
  }, [events, currentDate])

  const { totalPassengersToday, totalBookingsToday } = useMemo(() => {
    return boatDailyStats.reduce(
      (accumulator, stat) => ({
        totalPassengersToday: accumulator.totalPassengersToday + stat.passengers,
        totalBookingsToday: accumulator.totalBookingsToday + stat.bookings
      }),
      { totalPassengersToday: 0, totalBookingsToday: 0 }
    )
  }, [boatDailyStats])

  const fetchBoats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/boats')
      if (!res.ok) throw new Error('Erreur API')
      const data: unknown = await res.json()
      if (!Array.isArray(data)) {
        setResources([])
        return
      }
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
          const rawTitle = typeof candidate.title === 'string' && candidate.title.trim().length
            ? candidate.title.trim()
            : typeof candidate.name === 'string' && candidate.name.trim().length
              ? candidate.name.trim()
              : null
          const parsedCapacity = parseNumber(candidate.capacity)
          const capacity = Number.isFinite(parsedCapacity) && parsedCapacity > 0
            ? Math.round(parsedCapacity)
            : 12
          return {
            id: parsedId,
            title: rawTitle ?? `Barque ${parsedId}`,
            capacity
          }
        })
        .filter((boat): boat is BoatResource => boat !== null)
        .sort((a, b) => a.id - b.id)
      setResources(normalized)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Erreur chargement barques', msg)
    } finally {
      setLoadingBoats(false)
    }
  }, [])

  useEffect(() => {
    fetchBoats()
  }, [fetchBoats])

  const handleNavigate = (date: Date) => {
    const next = startOfDay(date)
    setCurrentDate(next)
    setCurrentRange({ start: next, end: endOfDay(next) })
  }

  const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
    let start: Date, end: Date
    if (Array.isArray(range)) {
      start = startOfDay(range[0])
      end = endOfDay(range[range.length - 1])
    } else {
      start = startOfDay(range.start)
      end = endOfDay(range.end)
    }
    setCurrentRange({ start, end })
  }

  const shiftCurrentDay = useCallback((delta: number) => {
    setCurrentDate((prev) => {
      const next = startOfDay(addDays(prev, delta))
      setCurrentRange({ start: next, end: endOfDay(next) })
      return next
    })
  }, [setCurrentRange])

  const handleDateInputChange = useCallback((value: string) => {
    if (!value) return
    const parsed = parseISO(value)
    if (Number.isNaN(parsed.getTime())) return
    const next = startOfDay(parsed)
    setCurrentDate(next)
    setCurrentRange({ start: next, end: endOfDay(next) })
  }, [setCurrentRange])

  const handleSelectBooking = (event: BookingDetails) => {
    const siblings = events
      .filter((booking) => isSameMinute(booking.start, event.start))
      .sort((a, b) => {
        if (a.resourceId !== b.resourceId) return a.resourceId - b.resourceId
        return (a.clientName || '').localeCompare(b.clientName || '')
      })

    setDetailsGroup(siblings)
    const index = Math.max(0, siblings.findIndex((booking) => booking.id === event.id))
    setDetailsGroupIndex(index)
    setSelectedBooking(siblings[index] ?? event)
    closeDetailsPaymentSelector()
    setShowDetailsModal(true)
  }

  const handleSlotSelect = (slotInfo: SlotSelectionInfo) => {
    const duration = new Date(slotInfo.end).getTime() - new Date(slotInfo.start).getTime()
    if (duration > 5 * 60 * 1000) return

    const s = new Date(slotInfo.start)
    const dateLabel = format(s, 'yyyy-MM-dd')
    const timeLabel = format(s, 'HH:mm')
    const { instant: startTime, wallHour, wallMinute } = parseParisWallDate(dateLabel, timeLabel)
    if (Number.isNaN(startTime.getTime())) return
    const modalSlotStart = buildWallUtcDate(dateLabel, timeLabel)
    const { resourceId } = slotInfo
    const rotationBoatId = resolveBoatIdForSlot(wallHour, wallMinute, resourceId)

    const matchingDepartures = events
      .filter((event) => isSameMinute(event.start, startTime))
      .sort((a, b) => {
        const aLoad = a.totalOnBoat ?? a.peopleCount ?? 0
        const bLoad = b.totalOnBoat ?? b.peopleCount ?? 0
        return bLoad - aLoad
      })

    const targetDeparture = matchingDepartures[0]

    const boatId = targetDeparture
      ? Number(targetDeparture.resourceId) || rotationBoatId
      : rotationBoatId

    setSelectedSlotDetails({ start: modalSlotStart, boatId })
    setShowQuickBookModal(true)
  }

  const handleQuickBookingSuccess = () => {
    setShowQuickBookModal(false)
    mutate()
  }

  const closeDetailsModal = useCallback(() => {
    setShowDetailsModal(false)
    setSelectedBooking(null)
    closeDetailsPaymentSelector()
  }, [closeDetailsPaymentSelector])

  const navigateDetailsBooking = useCallback(
    (direction: 'prev' | 'next') => {
      if (!detailsGroup.length) return
      const delta = direction === 'prev' ? -1 : 1
      const nextIndex = detailsGroupIndex + delta
      if (nextIndex < 0 || nextIndex >= detailsGroup.length) return
      setDetailsGroupIndex(nextIndex)
      closeDetailsPaymentSelector()
      setSelectedBooking(detailsGroup[nextIndex])
    },
    [closeDetailsPaymentSelector, detailsGroup, detailsGroupIndex]
  )

  const selectedBookingStartKey = selectedBooking ? selectedBooking.start.getTime() : null

  useEffect(() => {
    if (!showDetailsModal || !selectedBooking) return
    const siblings = events
      .filter((booking) => isSameMinute(booking.start, selectedBooking.start))
      .sort((a, b) => {
        if (a.resourceId !== b.resourceId) return a.resourceId - b.resourceId
        return (a.clientName || '').localeCompare(b.clientName || '')
      })

    if (!siblings.length) {
      setShowDetailsModal(false)
      setSelectedBooking(null)
      setDetailsGroup([])
      setDetailsGroupIndex(0)
      closeDetailsPaymentSelector()
      return
    }

    setDetailsGroup(siblings)
    const foundIndex = siblings.findIndex((booking) => booking.id === selectedBooking.id)
    const targetIndex = foundIndex === -1 ? 0 : foundIndex
    const targetBooking = siblings[targetIndex]
    setDetailsGroupIndex(targetIndex)
    if (targetBooking) {
      setSelectedBooking(targetBooking)
    }
  }, [closeDetailsPaymentSelector, events, selectedBooking, selectedBookingStartKey, showDetailsModal])

  useEffect(() => {
    if (!showDetailsModal) {
      setDetailsGroup([])
      setDetailsGroupIndex(0)
      closeDetailsPaymentSelector()
    }
  }, [closeDetailsPaymentSelector, showDetailsModal])

  const openBoatPlanForStat = useCallback((stat: BoatDailyStat) => {
    if (!stat.nextSlot) {
      alert(`Aucun départ à venir pour ${stat.title}.`)
      return
    }

    const departureStart = stat.nextSlot.start

    const matchingBookings = events
      .filter((event) => event.resourceId === stat.id && isSameMinute(event.start, departureStart))
      .sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''))

    if (!matchingBookings.length) {
      alert('Aucune réservation associée à ce départ.')
      return
    }

    setBoatPlanModal({
      boat: { id: stat.id, title: stat.title, capacity: stat.capacity || 12 },
      departure: stat.nextSlot.start,
      bookings: matchingBookings
    })
  }, [events])

  const handleDepartureSubmission = useCallback(
    async (statuses: Record<string, BoardingStatus>) => {
      if (!boatPlanModal) return false
      const { bookings, boat, departure } = boatPlanModal
      if (!bookings.length) return false

      if (isLockedDate(departure)) {
        alert('Période verrouillée : journée clôturée, départ impossible.')
        return false
      }

      const presentCount = bookings.reduce((sum, booking) => {
        if (statuses[booking.id] === 'NO_SHOW') return sum
        return sum + (booking.peopleCount || 0)
      }, 0)
      const missing = Math.max(boat.capacity - presentCount, 0)
      if (missing > 0) {
        const confirmed = window.confirm(
          `Il reste ${missing} place${missing > 1 ? 's' : ''} libre${missing > 1 ? 's' : ''}. Confirmer le départ ?`
        )
        if (!confirmed) return false
      }

      try {
        for (const booking of bookings) {
          const desiredStatus = statuses[booking.id] ?? 'EMBARQUED'
          if (booking.checkinStatus === desiredStatus) continue
          const res = await fetch(`/api/bookings/${booking.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newCheckinStatus: desiredStatus })
          })
          if (!res.ok) throw new Error('update-failed')
        }
        await mutate()
        setBoatPlanModal(null)
        return true
      } catch (error) {
        console.error('Erreur lors du départ de la barque', error)
        alert('Impossible de finaliser le départ, réessayez.')
        return false
      }
    },
    [boatPlanModal, isLockedDate, mutate]
  )

  const handleRenameBoat = async (boatId: number, currentName: string) => {
    const newName = prompt(`Nom du batelier pour la barque ${boatId} ?`, currentName)
    if (newName && newName !== currentName) {
      await fetch('/api/admin/boats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: boatId, name: newName })
      })
      fetchBoats()
    }
  }

  const handleStatusUpdate = async (
    id: string,
    newCheckinStatus?: BoardingStatus,
    newIsPaid?: boolean
  ) => {
    const targetDate = selectedBooking?.start ?? new Date()
    if (isLockedDate(targetDate)) {
      alert('Période verrouillée: la journée est clôturée, modification impossible.')
      return
    }
    const body: BookingUpdatePayload = {}
    if (newCheckinStatus) body.newCheckinStatus = newCheckinStatus
    if (newIsPaid !== undefined) body.newIsPaid = newIsPaid
    // If marking as paid and we have a selected payment method from details modal, include it
    const rawCashValue = detailsMarkPaid?.provider === 'cash' ? detailsMarkPaid.cashGiven ?? '' : ''
    const parsedCashValue = rawCashValue ? Number.parseFloat(rawCashValue) : Number.NaN
    const hasCashAmount = detailsMarkPaid?.provider === 'cash' && !Number.isNaN(parsedCashValue)
    const normalizedCashValue = hasCashAmount ? Number(parsedCashValue.toFixed(2)) : undefined

    if (newIsPaid === true && detailsMarkPaid?.provider) {
      body.paymentMethod = {
        provider: detailsMarkPaid.provider,
        methodType: detailsMarkPaid.provider === 'voucher' ? detailsMarkPaid.methodType : undefined,
        amountReceived: normalizedCashValue,
        changeDue:
          normalizedCashValue !== undefined && typeof selectedBooking?.totalPrice === 'number'
            ? Number((normalizedCashValue - selectedBooking.totalPrice).toFixed(2))
            : undefined
      }
    }

    if (selectedBooking) {
      setSelectedBooking({
        ...selectedBooking,
        checkinStatus:
          newCheckinStatus !== undefined
            ? newCheckinStatus
            : selectedBooking.checkinStatus,
        isPaid:
          newIsPaid !== undefined ? newIsPaid : selectedBooking.isPaid
      })
    }
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (res.ok) {
      if (newIsPaid !== undefined) {
        closeDetailsPaymentSelector()
      }
      mutate()
    } else alert('Erreur mise à jour')
  }

  const handleCompleteBooking = useCallback(
    async (bookingId: string) => {
      if (!bookingId) return
      const targetBooking =
        (selectedBooking && selectedBooking.id === bookingId
          ? selectedBooking
          : detailsGroup.find((detail) => detail.id === bookingId)) ?? null
      const targetDate = targetBooking?.start ?? new Date()
      if (isLockedDate(targetDate)) {
        alert('Période verrouillée: finalisation impossible (journée clôturée).')
        return
      }

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

        await mutate()
        setSelectedBooking((previous) =>
          previous && previous.id === bookingId ? { ...previous, status: 'COMPLETED' } : previous
        )
        setDetailsGroup((previous) =>
          previous.map((detail) => (detail.id === bookingId ? { ...detail, status: 'COMPLETED' } : detail))
        )
        alert('Sortie complétée.')
      } catch (error) {
        console.error(error)
        alert(error instanceof Error ? error.message : 'Finalisation impossible.')
      } finally {
        setCompletionLoading(null)
      }
    },
    [detailsGroup, isLockedDate, mutate, selectedBooking]
  )

  const handleDelete = async (id: string, title: string) => {
    const targetDate = selectedBooking?.start ?? new Date()
    if (isLockedDate(targetDate)) { alert('Période verrouillée: suppression impossible (journée clôturée).'); return }
    if (!confirm(`ANNULER la réservation de ${title} ?`)) return
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    if (res.status === 401) {
      alert('Session expirée.')
      await logout()
      return
    }
    if (res.ok) {
      mutate()
      setShowDetailsModal(false)
    } else {
      alert('Erreur suppression')
    }
  }

  const handleEditTime = async (booking: BookingDetails) => {
    if (isLockedDate(booking.start)) { alert('Période verrouillée: modification d\'heure impossible (journée clôturée).'); return }
    try {
      const defaultTime = format(booking.start, 'HH:mm')
      const input = prompt('Nouvelle heure (HH:mm)', defaultTime) || ''
      const m = input.trim().match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return
      const hh = parseInt(m[1], 10)
      const mm = parseInt(m[2], 10)
      if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return

      const d = booking.start
      const dateLabel = format(d, 'yyyy-MM-dd')
      const paddedTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      const { instant: nextStart } = parseParisWallDate(dateLabel, paddedTime)
      if (Number.isNaN(nextStart.getTime())) {
        alert("Horaire invalide")
        return
      }

      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: nextStart.toISOString() })
      })
      if (!res.ok) {
        alert("Échec de la mise à jour de l'heure")
        return
      }
      mutate()
      // if details modal is open, update local state time for snappy UX
      if (selectedBooking && selectedBooking.id === booking.id) {
        const wall = new Date(d)
        wall.setHours(hh, mm, 0, 0)
        setSelectedBooking({ ...selectedBooking, start: wall })
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(msg)
    }
  }

  const AddButtonWrapper: FC<PlanningTimeSlotWrapperProps> = ({ children, value, resource }) => {
    const onClick = () => {
      const baseValue = value ?? new Date()
      const v = baseValue instanceof Date ? baseValue : new Date(baseValue)
      if (Number.isNaN(v.getTime())) return
      const dateLabel = format(v, 'yyyy-MM-dd')
      const timeLabel = format(v, 'HH:mm')
      const { instant: startTime, wallHour, wallMinute } = parseParisWallDate(dateLabel, timeLabel)
      if (Number.isNaN(startTime.getTime())) return
      const modalSlotStart = buildWallUtcDate(dateLabel, timeLabel)
      const fallbackBoatId = resolveBoatIdForSlot(wallHour, wallMinute, resource)

      const matchingDepartures = events
        .filter((event) => isSameMinute(event.start, startTime))
        .sort((a, b) => {
          const aLoad = a.totalOnBoat ?? a.peopleCount ?? 0
          const bLoad = b.totalOnBoat ?? b.peopleCount ?? 0
          return bLoad - aLoad
        })

      const targetDeparture = matchingDepartures[0]

      const inferredBoatId = targetDeparture
        ? Number(targetDeparture.resourceId) || fallbackBoatId
        : fallbackBoatId

      setSelectedSlotDetails({ start: modalSlotStart, boatId: inferredBoatId })
      setShowQuickBookModal(true)
    }

    return (
      <div
        className="h-full w-full relative group cursor-pointer hover:bg-blue-50/50 transition-colors flex items-center justify-center"
        onClick={onClick}
        onTouchEnd={onClick}
        role="button"
        aria-label="Ajouter une réservation"
      >
        {children}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-blue-400 text-lg font-bold select-none">+</span>
        </div>
      </div>
    )
  }

  const ResourceHeader: FC<ResourceHeaderProps<BoatResource>> = ({ label, resource }) => {
    const labelText = typeof label === 'string' ? label : resource?.title ?? ''
    const resolvedResource = resource ?? resources.find((r) => r.title === labelText)
    return (
      <div
        className="text-center py-2 group cursor-pointer hover:bg-blue-50 transition rounded"
        onClick={() => resolvedResource && handleRenameBoat(resolvedResource.id, resolvedResource.title)}
        title="Changer le nom"
      >
        <div className="font-bold text-blue-900 text-lg flex justify-center items-center gap-2">
          {labelText || '—'}{' '}
          <span className="text-[10px] opacity-0 group-hover:opacity-100 text-slate-400">✏️</span>
        </div>
        <div className="text-xs text-slate-500 font-bold bg-blue-50 rounded-full px-2 py-0.5 inline-block border border-blue-100 mt-1">
          Max: {resolvedResource?.capacity || 12}
        </div>
      </div>
    )
  }

  const EventComponent = ({ event }: { event: BookingDetails }) => {
    const displayName = event.title
    const statusKey = event.checkinStatus || event.status || 'DEFAULT'
    const theme = STATUS_THEME[statusKey] ?? STATUS_THEME.DEFAULT
    const flag = LANGUAGE_FLAGS[event.language?.toUpperCase?.() ?? 'FR'] ?? '🌐'
    const remaining = Math.max(0, (event.boatCapacity || 0) - (event.totalOnBoat || 0))
    const usage = event.boatCapacity ? (event.totalOnBoat ?? 0) / event.boatCapacity : 0

    return (
      <div
        className="sn-event group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-xl px-2.5 py-2 text-white"
        style={{ color: theme.text }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete(event.id, event.clientName)
          }}
          className="absolute right-1 top-1 rounded px-1 text-[10px] font-bold text-white/60 transition hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100"
          aria-label="Supprimer"
        >
          ✕
        </button>

        <div className="sn-event-header flex flex-wrap items-start justify-between gap-1 pr-4">
          <div className="flex min-w-0 items-center gap-1 font-semibold text-white/95">
            <span className="sn-event-flag leading-none">{flag}</span>
            <span className="sn-event-title leading-tight">{displayName}</span>
          </div>
          <span className={`sn-event-badge rounded-full px-2 py-0.5 font-extrabold uppercase tracking-wide ${theme.badge}`}>
            {theme.label}
          </span>
        </div>

        <div className="sn-event-meta mt-1 flex flex-wrap items-center gap-2">
          <span className="sn-event-pill rounded-full bg-white/20 px-2 py-0.5 font-bold">
            {event.peopleCount} pax
          </span>
          <span className="sn-event-breakdown flex items-center gap-1 text-white/90">
            <span>A{event.adults}</span>
            <span>E{event.children}</span>
            <span>B{event.babies}</span>
          </span>
        </div>

        <div className="sn-event-load mt-1 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="sn-event-load-label font-semibold text-white/90">Charge {event.totalOnBoat}/{event.boatCapacity}</span>
            <span
              className={`rounded-full border border-white/40 px-2 py-0.5 font-bold ${
                remaining === 0 ? 'bg-rose-500/80' : remaining <= 2 ? 'bg-amber-400/60 text-slate-900' : 'bg-white/20'
              }`}
            >
              {remaining} libres
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, usage * 100))}%`,
                backgroundColor: 'rgba(255,255,255,0.85)'
              }}
            />
          </div>
        </div>

        <div className="sn-event-footer mt-2 flex items-center justify-between text-white/90">
          <div className="sn-event-payment flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${event.isPaid ? 'bg-emerald-300' : 'bg-rose-300'}`}
              title={event.isPaid ? 'Payé' : 'À régler'}
            />
            <span>{event.isPaid ? 'Payé' : 'À régler'}</span>
          </div>
          <span className="sn-event-time font-semibold">{format(event.start, 'HH:mm')}</span>
        </div>

      </div>
    )
  }

  const slotPropGetter = (date: Date) => {
    const m = date.getHours() * 60 + date.getMinutes()
    if (m >= 720 && m < 810) {
      return {
        style: {
          backgroundColor: '#f3f4f6',
          backgroundImage:
            'repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 1px, transparent 0, transparent 50%)',
          backgroundSize: '10px 10px',
          opacity: 0.5,
          pointerEvents: 'none' as const
        }
      }
    }
    return {}
  }

  const BoatDepartureModal = ({
    boat,
    bookings,
    departure,
    onClose,
    onDepart
  }: {
    boat: BoatPlanModalState['boat']
    bookings: BookingDetails[]
    departure: Date
    onClose: () => void
    onDepart: (statuses: Record<string, BoardingStatus>) => Promise<boolean>
  }) => {
    const [statuses, setStatuses] = useState<Record<string, BoardingStatus>>(() => {
      const initial: Record<string, BoardingStatus> = {}
      bookings.forEach((booking) => {
        initial[booking.id] = deriveInitialStatus(booking)
      })
      return initial
    })
    const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({})
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
      const next: Record<string, BoardingStatus> = {}
      bookings.forEach((booking) => {
        next[booking.id] = deriveInitialStatus(booking)
      })
      setStatuses(next)
    }, [bookings])

    const colorMap = useMemo(() => {
      const map: Record<string, string> = {}
      bookings.forEach((booking, index) => {
        map[booking.id] = BOAT_COLOR_PALETTE[index % BOAT_COLOR_PALETTE.length]
      })
      return map
    }, [bookings])

    const occupantsByBooking = useMemo(() => {
      return bookings.reduce<Record<string, SeatOccupant[]>>((accumulator, booking) => {
        accumulator[booking.id] = buildOccupantsForBooking(booking)
        return accumulator
      }, {})
    }, [bookings])

    const presentCount = useMemo(
      () =>
        bookings.reduce((sum, booking) => {
          if (statuses[booking.id] === 'NO_SHOW') return sum
          return sum + (booking.peopleCount || 0)
        }, 0),
      [bookings, statuses]
    )

    const seatPlan = useMemo(() => computeSeatPlan(bookings, statuses), [bookings, statuses])

    const missingSeats = Math.max(boat.capacity - presentCount, 0)

    const statusBreakdown = useMemo(() => {
      return bookings.reduce(
        (accumulator, booking) => {
          const current = statuses[booking.id] ?? deriveInitialStatus(booking)
          if (current === 'NO_SHOW') accumulator.noShow += 1
          else if (current === 'EMBARQUED') accumulator.embarked += 1
          else accumulator.confirmed += 1
          return accumulator
        },
        { embarked: 0, confirmed: 0, noShow: 0 }
      )
    }, [bookings, statuses])

    const applyStatusChange = async (booking: BookingDetails, nextStatus: BoardingStatus) => {
      const previousStatus = statuses[booking.id] ?? deriveInitialStatus(booking)
      if (previousStatus === nextStatus) return
      setStatuses((current) => ({ ...current, [booking.id]: nextStatus }))
      setStatusUpdating((current) => ({ ...current, [booking.id]: true }))
      try {
        const res = await fetch(`/api/bookings/${booking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newCheckinStatus: nextStatus })
        })
        if (!res.ok) throw new Error('update-failed')
        await mutate()
      } catch (error) {
        console.error('Erreur mise à jour statut via modal', error)
        alert('Impossible de mettre à jour le statut. Réessayez.')
        setStatuses((current) => ({ ...current, [booking.id]: previousStatus }))
      } finally {
        setStatusUpdating((current) => ({ ...current, [booking.id]: false }))
      }
    }

    const handleDepartClick = async () => {
      setIsSaving(true)
      const success = await onDepart(statuses)
      if (!success) {
        setIsSaving(false)
      }
    }

    return (
      <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[92vh]">
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Préparer le départ de {boat.title}</h2>
              <p className="text-sm text-slate-500">
                Départ prévu à {format(departure, 'HH:mm')} • Capacité {boat.capacity}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="grid h-full grid-cols-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-2">
              <div className="space-y-4 pr-2">
                {bookings.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Aucune réservation pour ce départ.
                  </div>
                ) : (
                  bookings.map((booking) => {
                    const status = statuses[booking.id] ?? deriveInitialStatus(booking)
                    const occupants = occupantsByBooking[booking.id] || []
                    const color = colorMap[booking.id]
                    const summaryLabel = `${booking.adults || 0}A · ${booking.children || 0}E · ${booking.babies || 0}B`
                    const statusLabel =
                      status === 'NO_SHOW' ? 'No-show' : status === 'EMBARQUED' ? 'Embarqué' : 'Confirmé'
                    const toneMap: Record<'CONFIRMED' | 'EMBARQUED' | 'NO_SHOW', string> = {
                      CONFIRMED: 'sn-pill sn-pill--blue',
                      EMBARQUED: 'sn-pill sn-pill--emerald',
                      NO_SHOW: 'sn-pill sn-pill--amber'
                    }
                    const statusKey = status === 'NO_SHOW' ? 'NO_SHOW' : status === 'EMBARQUED' ? 'EMBARQUED' : 'CONFIRMED'
                    const statusBadgeClass = toneMap[statusKey]
                    return (
                      <div key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{booking.clientName}</p>
                            <p className="text-xs text-slate-500">
                              {booking.peopleCount} passagers • {booking.language}{' '}
                              {booking.message ? '• Note' : ''}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">{summaryLabel}</p>
                          </div>
                          <span className={statusBadgeClass}>
                            <span className="sn-pill__dot" aria-hidden="true" />
                            {statusLabel}
                          </span>
                        </div>

                        {status === 'NO_SHOW' ? (
                          <div className="mt-3 rounded border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            Marqué en no-show — ces passagers ne seront pas placés.
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {occupants.map((occupant) => (
                              <span
                                key={occupant.id}
                                className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-white shadow"
                                style={{ backgroundColor: color, opacity: 0.95 }}
                                title={occupant.label}
                              >
                                {occupant.shortLabel}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => applyStatusChange(booking, 'CONFIRMED')}
                            disabled={statusUpdating[booking.id]}
                            className={`${
                              status === 'CONFIRMED'
                                ? `${toneMap.CONFIRMED} shadow-[0_8px_18px_rgba(2,6,23,0.45)]`
                                : 'sn-pill sn-pill--outline text-slate-400 hover:text-slate-200'
                            } ${statusUpdating[booking.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <span className="sn-pill__dot" aria-hidden="true" />
                            Confirmé
                          </button>
                          <button
                            type="button"
                            onClick={() => applyStatusChange(booking, 'EMBARQUED')}
                            disabled={statusUpdating[booking.id]}
                            className={`${
                              status === 'EMBARQUED'
                                ? `${toneMap.EMBARQUED} shadow-[0_8px_18px_rgba(2,6,23,0.45)]`
                                : 'sn-pill sn-pill--outline text-slate-400 hover:text-slate-200'
                            } ${statusUpdating[booking.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <span className="sn-pill__dot" aria-hidden="true" />
                            Embarqué
                          </button>
                          <button
                            type="button"
                            onClick={() => applyStatusChange(booking, 'NO_SHOW')}
                            disabled={statusUpdating[booking.id]}
                            className={`${
                              status === 'NO_SHOW'
                                ? `${toneMap.NO_SHOW} shadow-[0_8px_18px_rgba(2,6,23,0.45)]`
                                : 'sn-pill sn-pill--outline text-slate-400 hover:text-slate-200'
                            } ${statusUpdating[booking.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <span className="sn-pill__dot" aria-hidden="true" />
                            No-show
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Plan de la barque</span>
                    <span className="text-xs font-normal text-slate-400">Avant ↑</span>
                  </div>
                  <div className="mt-4">
                    {seatPlan.error ? (
                      <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        {seatPlan.error}
                      </div>
                    ) : presentCount === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        Aucun passager marqué embarqué pour ce départ.
                      </div>
                    ) : (
                      <div className="relative mx-auto h-[360px] max-w-[460px]">
                        <div className="boat-shell absolute inset-0">
                          <div className="boat-bow-indicator" />
                        </div>
                        <div className="absolute left-16 right-16 top-12 bottom-16 flex flex-col justify-between">
                          {seatPlan.benches.map((bench) => (
                            <div key={bench.benchIndex} className="relative">
                              <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Banc {bench.benchIndex + 1}
                              </div>
                              <div className="flex items-center justify-evenly gap-3">
                                {bench.seats.map((seat) =>
                                  seat.occupant ? (
                                    <div
                                      key={`${bench.benchIndex}-${seat.seatIndex}`}
                                      className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg"
                                      style={{ backgroundColor: colorMap[seat.occupant.bookingId] ?? '#64748b' }}
                                      title={seat.occupant.label}
                                    >
                                      {seat.occupant.shortLabel}
                                    </div>
                                  ) : (
                                    <div
                                      key={`${bench.benchIndex}-${seat.seatIndex}`}
                                      className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white/60 text-[10px] font-semibold text-slate-400"
                                    >
                                      Libre
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-600">
                  <p className="font-semibold text-slate-700">Résumé embarquement</p>
                  <p className="mt-2">
                    Embarqués : <span className="font-bold text-slate-900">{presentCount}</span> / {boat.capacity}
                  </p>
                  {missingSeats > 0 && (
                    <p className="mt-1 text-amber-600">Places libres : {missingSeats}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Ajustez les statuts avant de marquer la barque comme partie.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="text-sm text-slate-500">
              Confirmés: {statusBreakdown.confirmed} • Embarqués: {statusBreakdown.embarked} • No-show: {statusBreakdown.noShow}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                disabled={isSaving}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDepartClick}
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isSaving}
              >
                {isSaving ? 'Validation...' : 'Marquer la barque partie'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const sharedModals = (
    <>
      {showDetailsModal && selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          resources={resources}
          detailsMarkPaid={detailsMarkPaid}
          setDetailsMarkPaid={setDetailsMarkPaid}
          onClose={closeDetailsModal}
          onNavigate={navigateDetailsBooking}
          hasPrev={detailsGroupIndex > 0}
          hasNext={detailsGroupIndex < detailsGroup.length - 1}
          groupIndex={detailsGroupIndex}
          groupTotal={detailsGroup.length}
          paymentSelectorOpen={detailsPaymentSelectorOpen}
          onPaymentSelectorOpen={openDetailsPaymentSelector}
          onPaymentSelectorClose={closeDetailsPaymentSelector}
          onStatusUpdate={handleStatusUpdate}
          onEditTime={handleEditTime}
          onDelete={handleDelete}
          onComplete={handleCompleteBooking}
          completionLoadingId={completionLoading}
        />
      )}

      {showQuickBookModal && selectedSlotDetails && (
        <QuickBookingModal
          slotStart={selectedSlotDetails.start}
          boatId={selectedSlotDetails.boatId}
          resources={resources}
          onClose={() => setShowQuickBookModal(false)}
          onSuccess={handleQuickBookingSuccess}
          canOverrideLockedDays={canOverrideLockedDays}
        />
      )}

      {boatPlanModal && (
        <BoatDepartureModal
          boat={boatPlanModal.boat}
          bookings={boatPlanModal.bookings}
          departure={boatPlanModal.departure}
          onClose={() => setBoatPlanModal(null)}
          onDepart={handleDepartureSubmission}
        />
      )}
    </>
  )

  if (isNative) {
    const dayTitle = format(currentDate, 'EEEE d MMMM', { locale: fr })
    const daySubtitle = format(currentDate, 'yyyy', { locale: fr })

    const parseBoatId = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10)
        return Number.isFinite(parsed) ? parsed : null
      }
      return null
    }

    const groupedSlots: Array<{ slotTime: Date; items: BookingDetails[] }> = []
    let currentKey: number | null = null
    dayEvents.forEach((event) => {
      const key = event.start.getTime()
      if (currentKey !== null && key === currentKey) {
        groupedSlots[groupedSlots.length - 1].items.push(event)
      } else {
        groupedSlots.push({ slotTime: event.start, items: [event] })
        currentKey = key
      }
    })

    const mobileGroups: MobileTimelineGroup<BookingDetails>[] = groupedSlots.map((group, groupIndex) => {
      const representative = group.items[0]
      const normalizedBoatId = parseBoatId(representative.resourceId)

      const loadEntries: Array<{
        key: string
        label: string
        total: number
        capacity: number
        badgeClass: string
      }> = []

      group.items.forEach((booking) => {
        const boatId = parseBoatId(booking.resourceId) ?? normalizedBoatId
        const boatKey = boatId !== null ? `boat-${boatId}` : `boat-${booking.resourceId ?? 'unknown'}`
        let entry = loadEntries.find((item) => item.key === boatKey)
        const boatResource = boatId !== null ? resourceMap.get(boatId) : undefined
        if (!entry) {
          entry = {
            key: boatKey,
            label: boatResource?.title ?? `Barque ${boatId !== null ? boatId : '?'}`,
            total: 0,
            capacity: boatResource?.capacity ?? booking.boatCapacity ?? 0,
            badgeClass: getBoatTheme(boatId).badge
          }
          loadEntries.push(entry)
        }
        const loadValue = booking.totalOnBoat ?? booking.peopleCount ?? 0
        entry.total += loadValue
        if (!entry.capacity || entry.capacity <= 0) {
          entry.capacity = boatResource?.capacity ?? booking.boatCapacity ?? 0
        }
      })

      return {
        id: `${group.slotTime.getTime()}-${groupIndex}`,
        slotTime: group.slotTime,
        items: group.items,
        indicatorClass: getBoatTheme(normalizedBoatId).indicator,
        loadSummary: loadEntries
      }
    })

    return (
      <AdminPageShell
        title="Planning"
        description="Agenda quotidien en vue mobile"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => mutate()}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm"
            >
              Actualiser
            </button>
            <button
              onClick={() => logout()}
              className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 shadow-sm"
            >
              Déconnexion
            </button>
          </div>
        }
        footerNote="Données mises à jour automatiquement."
      >
        <div className="flex flex-1 flex-col gap-4 px-4 pb-safe pt-4">
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftCurrentDay(-1)}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm"
              aria-label="Jour précédent"
            >
              ◀
            </button>
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{daySubtitle}</div>
              <div className="text-2xl font-bold capitalize text-slate-900">{dayTitle}</div>
            </div>
            <button
              type="button"
              onClick={() => shiftCurrentDay(1)}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm"
              aria-label="Jour suivant"
            >
              ▶
            </button>
          </header>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Départs</div>
              <div className="text-xl font-bold text-slate-900">{totalBookingsToday}</div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Passagers</div>
              <div className="text-xl font-bold text-slate-900">{totalPassengersToday}</div>
            </div>
          </section>

          {statusSummary.length > 0 && (
            <section className="flex flex-wrap gap-2">
              {statusSummary.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{
                    background: item.theme.background,
                    color: item.theme.text,
                    border: `1px solid ${item.theme.border}`
                  }}
                >
                  {item.label}
                  <span className="rounded-full bg-white/15 px-2 py-px text-[10px] font-bold">{item.count}</span>
                </span>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-3">
            {loadingBoats ? (
              <div className="flex justify-center py-10 text-sm font-semibold text-slate-500">Chargement du planning…</div>
            ) : dayEvents.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
                Aucun départ prévu ce jour-là.
              </div>
            ) : (
              <MobileTimeline
                groups={mobileGroups}
                locale={fr}
                shouldConnectToNext={({ group, nextGroup }) => Boolean(nextGroup && isSameDay(group.slotTime, nextGroup.slotTime))}
                getItemKey={(event) => event.id}
                renderCard={(event) => {
                  const normalizedBoatId = parseBoatId(event.resourceId)
                  const boat = normalizedBoatId !== null ? resourceMap.get(normalizedBoatId) : undefined
                  const statusKey = event.checkinStatus || event.status || 'DEFAULT'
                  const theme = STATUS_THEME[statusKey] ?? STATUS_THEME.DEFAULT
                  const flag = LANGUAGE_FLAGS[event.language?.toUpperCase?.() ?? 'FR'] ?? '🌐'
                  const occupancy = `${event.totalOnBoat ?? event.peopleCount}/${boat?.capacity ?? '—'}`
                  const emailLabel = event.user?.email || '—'
                  const phoneLabel = event.user?.phone || 'Non renseigné'
                  const boatTheme = getBoatTheme(normalizedBoatId)

                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectBooking(event)}
                      className="flex min-w-[82vw] flex-shrink-0 snap-center flex-col gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 active:scale-[0.995]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Départ</span>
                          <span className="text-2xl font-extrabold text-slate-900">{format(event.start, 'HH:mm')}</span>
                          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{format(event.start, 'dd/MM', { locale: fr })}</span>
                        </div>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold"
                          style={{ background: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
                        >
                          {theme.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm text-slate-700">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="break-words text-sm font-semibold text-slate-900">{event.clientName}</span>
                          <span className="break-words text-[11px] font-medium tracking-[0.05em] text-slate-500">
                            <span className="mr-1 text-base">{flag}</span>
                            {emailLabel}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-slate-500">
                          <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                            {event.peopleCount} pax
                          </span>
                          <span className="text-[11px] text-slate-500">{occupancy} places</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${boatTheme.badge}`}>
                            {boat?.title ?? `Barque ${normalizedBoatId ?? '—'}`}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${boatTheme.pax}`}>
                            {event.totalOnBoat ?? event.peopleCount} / {boat?.capacity ?? event.boatCapacity ?? '—'} pax
                          </span>
                        </span>
                        <span className="break-words text-right font-semibold text-slate-700">📞 {phoneLabel}</span>
                      </div>
                    </button>
                  )
                }}
              />
            )}
          </section>
        </div>

        {sharedModals}
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title="Planning 🛶"
      description={loadingBoats ? 'Chargement des barques...' : 'Cliquez sur une case vide pour ajouter une réservation.'}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
              !rawBookings && !error
                ? 'bg-sky-100 text-sky-700 border-sky-200'
                : 'bg-green-100 text-green-700 border-green-200'
            }`}
          >
            {!rawBookings && !error ? (
              <>⏳ Chargement...</>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>{' '}
                LIVE
              </>
            )}
          </div>
          <button
            onClick={() => mutate()}
            className="px-4 py-2 bg-white border shadow-sm rounded hover:bg-slate-50 text-sm font-bold text-slate-600 transition"
          >
            Actualiser 🔄
          </button>
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-red-50 border border-red-100 shadow-sm rounded hover:bg-red-100 text-sm font-bold text-red-600 transition flex items-center gap-2"
          >
            Déconnexion 🚪
          </button>
        </div>
      }
      footerNote="Mises à jour automatiques toutes les 10 secondes."
    >
      {canOverrideLockedDays && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Mode override compta actif : les journées clôturées restent modifiables. Pensez à réexporter les journaux si vous corrigez une journée archivée.
        </div>
      )}

      {boatDailyStats.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Occupation du {format(currentDate, 'dd/MM')}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{totalPassengersToday} passagers</span>
              <span>{totalBookingsToday} réservations</span>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {boatDailyStats.map((stat) => (
              <div
                key={stat.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400"
                onClick={() => openBoatPlanForStat(stat)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openBoatPlanForStat(stat)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span className="truncate">{stat.title}</span>
                  <span className="text-xs font-bold text-slate-400">Cap. {stat.capacity}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{stat.passengers} passagers</span>
                  <span>{stat.bookings} réservation{stat.bookings > 1 ? 's' : ''}</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500"
                    style={{ width: `${Math.min(100, Math.round(stat.loadPct * 100))}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500">
                  <span>Pic: {stat.peakLoad}/{stat.capacity}</span>
                  <span>
                    {stat.nextSlot
                      ? `Prochain ${format(stat.nextSlot.start, 'HH:mm')} • ${stat.nextRemaining} libres`
                      : 'Aucun départ futur'}
                  </span>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-sky-600 flex items-center justify-end">
                  <span>Préparer le départ →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {statusSummary.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statuts</span>
          {statusSummary.map((item) => (
            <span
              key={item.key}
              className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${item.theme.background}, ${item.theme.backgroundSoft})`,
                color: item.theme.text,
                border: `1px solid ${item.theme.border}`
              }}
            >
              {item.label}
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{item.count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jour</span>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
          <button
            type="button"
            onClick={() => shiftCurrentDay(-1)}
            className="rounded-full px-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
            aria-label="Jour précédent"
          >
            ◀
          </button>
          <input
            type="date"
            value={format(currentDate, 'yyyy-MM-dd')}
            onChange={(event) => handleDateInputChange(event.target.value)}
            className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => shiftCurrentDay(1)}
            className="rounded-full px-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
            aria-label="Jour suivant"
          >
            ▶
          </button>
        </div>

        <span className="ml-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Plages</span>
        {[
          { key: 'standard' as const, label: 'Classique' },
          { key: 'morning' as const, label: 'Matin' },
          { key: 'afternoon' as const, label: 'Après-midi' }
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setPreset(option.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              preset === option.key
                ? 'border-sky-600 bg-sky-600 text-white shadow'
                : 'border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600'
            }`}
          >
            {option.label}
          </button>
        ))}

        <span className="ml-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Zoom</span>
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => clampZoom(prev - 0.1))}
            className="rounded-full px-2 font-bold text-slate-500 transition hover:text-slate-800"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center font-semibold">{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => clampZoom(prev + 0.1))}
            className="rounded-full px-2 font-bold text-slate-500 transition hover:text-slate-800"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        className="sn-card sn-zoom flex h-[70vh] flex-col"
        onWheelCapture={(e)=>{ if (e.ctrlKey) { e.preventDefault(); e.stopPropagation() } }}
        tabIndex={0}
        ref={containerRef}
      >
        {!loadingBoats && resources.length === 0 ? (
          <div className="h-full flex items-center justify-center text-red-500 font-bold">
            ⚠️ Aucune barque trouvée. Relancez le seed.
          </div>
        ) : (
          <div className="flex-1 overflow-auto" style={timeGridStyle}>
            <Calendar<BookingDetails, BoatResource>
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              date={currentDate}
              onNavigate={handleNavigate}
              onRangeChange={handleRangeChange}
              onSelectEvent={handleSelectBooking}
              onSelectSlot={handleSlotSelect}
              selectable={true}
              view={Views.DAY}
              defaultView={Views.DAY}
              views={['day']}
              resources={resources}
              resourceIdAccessor="id"
              resourceTitleAccessor="title"
              step={5}
              timeslots={1}
              min={calendarMin}
              max={calendarMax}
              culture="fr"
              onDoubleClickEvent={(event) => handleDelete(event.id, event.clientName)}
              slotPropGetter={slotPropGetter}
              components={{ event: EventComponent, resourceHeader: ResourceHeader, timeSlotWrapper: AddButtonWrapper }}
              style={{ height: '100%' }}
              eventPropGetter={(event) => {
                const statusKey = event.checkinStatus || event.status || 'DEFAULT'
                const theme = STATUS_THEME[statusKey] ?? STATUS_THEME.DEFAULT
                return {
                  style: {
                    background: `linear-gradient(135deg, ${theme.background}, ${theme.backgroundSoft})`,
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                    borderRadius: '12px',
                    boxShadow: '0 12px 22px rgba(15, 23, 42, 0.28)'
                  }
                }
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .sn-zoom { overscroll-behavior: contain; }
        .sn-zoom { touch-action: none; }
        .sn-zoom :global(.rbc-time-slot) { height: var(--slotH, 40px); }
        .sn-zoom :global(.rbc-time-gutter .rbc-time-slot) { height: var(--slotH, 40px); }
        :global(.rbc-time-content) { scrollbar-width: thin; }
        :global(.rbc-time-content) { background-image: linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px); background-size: 100% 20px; }
        :global(.rbc-time-gutter .rbc-time-slot) { border-right: 1px solid #e5e7eb; }
        :global(.rbc-time-content .rbc-time-slot) { border-top-color: #eef2f7; }
        :global(.sn-event) {
          font-size: clamp(9px, 0.65vw, 11px);
          line-height: 1.25;
          backdrop-filter: saturate(120%);
          border: 1px solid rgba(255,255,255,0.18);
          background-image: linear-gradient(160deg, rgba(255,255,255,0.08), rgba(15,23,42,0.12));
          box-shadow: 0 14px 24px rgba(15, 23, 42, 0.18);
        }
        :global(.sn-event *) { text-shadow: 0 1px 2px rgba(15,23,42,0.35); }
        :global(.sn-event-header) { gap: 0.3rem; }
        :global(.sn-event-title) {
          font-size: clamp(11px, 0.9vw, 13px);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          white-space: normal;
        }
        :global(.sn-event-flag) { font-size: clamp(14px, 1vw, 16px); }
        :global(.sn-event-badge) { font-size: clamp(8px, 0.65vw, 10px); letter-spacing: 0.1em; }
        :global(.sn-event-pill), :global(.sn-event-breakdown), :global(.sn-event-load), :global(.sn-event-footer) {
          font-size: clamp(8px, 0.6vw, 10px);
        }
        :global(.sn-event-load-label) { white-space: nowrap; }
        :global(.sn-event-payment) { gap: 0.35rem; }
        :global(.sn-event-time) { letter-spacing: 0.04em; }
        .boat-shell {
          transition: transform 0.24s ease, box-shadow 0.24s ease;
          clip-path: polygon(8% 3%, 92% 3%, 100% 18%, 100% 82%, 92% 97%, 8% 97%, 0% 82%, 0% 18%);
          background: linear-gradient(135deg, #e2e8f0, #f8fafc 55%, #cbd5f5);
          border: 4px solid rgba(148, 163, 184, 0.65);
          box-shadow: inset 0 20px 40px rgba(15, 23, 42, 0.18);
        }
        .boat-shell:hover { transform: translateY(-2px); box-shadow: inset 0 18px 38px rgba(15, 23, 42, 0.22), 0 25px 45px rgba(15, 23, 42, 0.18); }
        .boat-shell::before {
          content: '';
          position: absolute;
          inset: 18px 26px;
          clip-path: polygon(6% 5%, 94% 5%, 100% 20%, 100% 80%, 94% 95%, 6% 95%, 0% 80%, 0% 20%);
          border: 2px solid rgba(148, 163, 184, 0.55);
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(226, 232, 240, 0.8));
          box-shadow: inset 0 12px 20px rgba(148, 163, 184, 0.25);
          border-radius: 10px;
        }
        .boat-shell::after {
          content: '';
          position: absolute;
          inset: 30px 40px;
          clip-path: polygon(8% 7%, 92% 7%, 98% 20%, 98% 80%, 92% 93%, 8% 93%, 2% 80%, 2% 20%);
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.05));
          border-radius: 8px;
        }
        .boat-bow-indicator {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          height: 10px;
          width: 32px;
          background: linear-gradient(to right, #38bdf8, #0ea5e9);
          border-radius: 999px;
          box-shadow: 0 0 14px rgba(14, 165, 233, 0.45);
        }
        @media (max-width: 640px) {
          :global(.rbc-toolbar) { padding: 4px 0; }
          :global(.rbc-toolbar .rbc-btn-group) { gap: 4px; }
          :global(.rbc-toolbar button) { padding: 4px 6px; font-size: 12px; }
          :global(.rbc-time-view) { overflow-x: auto; }
          :global(.rbc-time-content) { overflow-x: auto; }
          :global(.rbc-time-slot) { height: 20px; }
          :global(.rbc-time-gutter .rbc-time-slot) { height: 20px; }
          :global(.rbc-label) { font-size: 11px; line-height: 1.1; }
          :global(.rbc-event) { padding: 4px 6px; border-radius: 8px; }
          :global(.rbc-event) span { white-space: normal; }
          :global(.rbc-resource-header) { padding: 6px 2px; font-size: 12px; }
          .sn-container { padding: 8px; }
        }
      `}</style>

      {sharedModals}
    </AdminPageShell>
  )
}
