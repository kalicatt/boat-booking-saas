'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay, isSameMinute, addDays, parseISO, subMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logout } from '@/lib/actions'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import QuickBookingModal from '@/components/QuickBookingModal'
import useSWR from 'swr'
import { AdminPageShell } from '../_components/AdminPageShell'

const STATUS_THEME: Record<string, { label: string; background: string; backgroundSoft: string; border: string; text: string; badge: string }> = {
  CONFIRMED: {
    label: 'Confirmée',
    background: '#2563eb',
    backgroundSoft: '#1d4ed8',
    border: '#93c5fd',
    text: '#f8fafc',
    badge: 'bg-blue-100 text-blue-700'
  },
  EMBARQUED: {
    label: 'Embarquée',
    background: '#0f766e',
    backgroundSoft: '#047857',
    border: '#6ee7b7',
    text: '#ecfdf5',
    badge: 'bg-emerald-100 text-emerald-700'
  },
  NO_SHOW: {
    label: 'No-show',
    background: '#f97316',
    backgroundSoft: '#ea580c',
    border: '#fcd34d',
    text: '#fff7ed',
    badge: 'bg-amber-100 text-amber-700'
  },
  PENDING: {
    label: 'En attente',
    background: '#64748b',
    backgroundSoft: '#475569',
    border: '#cbd5f5',
    text: '#f8fafc',
    badge: 'bg-slate-200 text-slate-700'
  },
  CANCELLED: {
    label: 'Annulée',
    background: '#dc2626',
    backgroundSoft: '#b91c1c',
    border: '#fecaca',
    text: '#fef2f2',
    badge: 'bg-rose-100 text-rose-700'
  },
  DEFAULT: {
    label: 'Autre',
    background: '#334155',
    backgroundSoft: '#1e293b',
    border: '#cbd5f5',
    text: '#e2e8f0',
    badge: 'bg-slate-200 text-slate-700'
  }
}

const BOOKING_STATUS_THEME: Record<'PENDING' | 'CONFIRMED' | 'CANCELLED', { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  CONFIRMED: { label: 'Confirmée', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Annulée', className: 'border-rose-200 bg-rose-50 text-rose-700' }
}

const LANGUAGE_FLAGS: Record<string, string> = {
  FR: '🇫🇷',
  EN: '🇬🇧',
  DE: '🇩🇪',
  ES: '🇪🇸',
  IT: '🇮🇹',
  PT: '🇵🇹',
  NL: '🇳🇱'
}

const locales = { 'fr': fr }
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales
})

interface BoatResource { id: number; title: string; capacity: number }
interface UserData { firstName: string; lastName: string; email: string; phone: string; role: string }

interface BookingDetails {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: number;
  clientName: string;
  peopleCount: number;
  adults: number;
  children: number;
  babies: number;
  totalOnBoat: number;
  boatCapacity: number;
  user: UserData;
  language: string;
  totalPrice: number;
  checkinStatus: 'CONFIRMED' | 'EMBARQUED' | 'NO_SHOW'
  isPaid: boolean;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  message?: string | null;
  payments?: Array<{ id: string; provider: string; methodType?: string | null; amount: number; currency: string; status: string; createdAt: string }>
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

type BoardingStatus = 'CONFIRMED' | 'EMBARQUED' | 'NO_SHOW'

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

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Erreur fetch')
  return res.json()
})

export default function ClientPlanningPage() {
  const [resources, setResources] = useState<BoatResource[]>([])
  const [loadingBoats, setLoadingBoats] = useState(true)
  const [preset, setPreset] = useState<'standard'|'morning'|'afternoon'>('standard')
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
    const onGestureStart = (e: any) => {
      // Safari/iOS specific pinch gesture
      e.preventDefault()
      e.stopPropagation()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', onGestureStart as any, { passive: false })
    return ()=>{
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', onGestureStart as any)
    }
  }, [clampZoom])

  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()))
  const [currentRange, setCurrentRange] = useState({ start: startOfDay(new Date()), end: endOfDay(new Date()) })

  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsMarkPaid, setDetailsMarkPaid] = useState<{ provider: string, methodType?: string }|null>(null)

  const [selectedSlotDetails, setSelectedSlotDetails] = useState<{ start: Date; boatId: number } | null>(null)
  const [showQuickBookModal, setShowQuickBookModal] = useState(false)
  const [boatPlanModal, setBoatPlanModal] = useState<BoatPlanModalState | null>(null)

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

  const apiUrl = `/api/admin/all-bookings?start=${currentRange.start.toISOString()}&end=${currentRange.end.toISOString()}`

  const { data: rawBookings, error, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    keepPreviousData: true
  })
  const { data: closures } = useSWR('/api/admin/closures', fetcher)

  const events = useMemo(() => {
    if (!rawBookings || !Array.isArray(rawBookings)) return []

    const loadMap: Record<string, number> = {}
    rawBookings.forEach((b: any) => {
      const key = `${b.startTime}_${b.boatId}`
      loadMap[key] = (loadMap[key] || 0) + b.numberOfPeople
    })

    return rawBookings
      .map((b: any) => {
        const clientFullName = `${b.user.firstName} ${b.user.lastName}`
        const displayTitle = clientFullName === 'Client Guichet' ? 'Guichet' : clientFullName

        const visualStart = new Date(b.startTime)
        const visualEnd = new Date(b.endTime)
        const startWall = new Date(
          visualStart.getUTCFullYear(),
          visualStart.getUTCMonth(),
          visualStart.getUTCDate(),
          visualStart.getUTCHours(),
          visualStart.getUTCMinutes()
        )
        const endWall = new Date(
          visualEnd.getUTCFullYear(),
          visualEnd.getUTCMonth(),
          visualEnd.getUTCDate(),
          visualEnd.getUTCHours(),
          visualEnd.getUTCMinutes()
        )
        if (isNaN(visualStart.getTime())) return null

        return {
          id: b.id,
          title: displayTitle,
          start: startWall,
          end: endWall,
          resourceId: b.boatId,
          peopleCount: b.numberOfPeople,
          adults: b.adults || 0,
          children: b.children || 0,
          babies: b.babies || 0,
          boatCapacity: b.boat.capacity,
          totalOnBoat: loadMap[`${b.startTime}_${b.boatId}`] || 0,
          user: b.user,
          language: b.language,
          totalPrice: b.totalPrice,
          checkinStatus: b.checkinStatus,
          isPaid: b.isPaid,
          status: b.status,
          clientName: clientFullName,
          message: b.message
        }
      })
      .filter((event: any) => event !== null) as BookingDetails[]
  }, [rawBookings])

  const focusDayKey = useMemo(() => format(currentDate, 'yyyy-MM-dd'), [currentDate])

  const boatDailyStats = useMemo<BoatDailyStat[]>(() => {
    if (!resources.length) return []

    const now = new Date()
    const graceThreshold = subMinutes(now, 12)

    return resources.map((resource) => {
      const todaysEvents = events.filter(
        (event) => event.resourceId === resource.id && format(event.start, 'yyyy-MM-dd') === focusDayKey
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
  }, [resources, events, focusDayKey])

  const statusSummary = useMemo(() => {
    const summaryMap = new Map<
      string,
      { key: string; label: string; count: number; theme: (typeof STATUS_THEME)['DEFAULT'] }
    >()

    events.forEach((event) => {
      if (format(event.start, 'yyyy-MM-dd') !== focusDayKey) return
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
  }, [events, focusDayKey])

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
      const data = await res.json()
      setResources(data)
    } catch (e) {
      console.error('Erreur chargement barques', e)
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
    setSelectedBooking(event)
    setShowDetailsModal(true)
  }

  const handleSlotSelect = (slotInfo: any) => {
    const duration = new Date(slotInfo.end).getTime() - new Date(slotInfo.start).getTime()
    if (duration > 5 * 60 * 1000) return

    const s = new Date(slotInfo.start)
    const startTime = new Date(
      Date.UTC(
        s.getFullYear(),
        s.getMonth(),
        s.getDate(),
        s.getHours(),
        s.getMinutes()
      )
    )
    const fallbackBoatId = Number(slotInfo.resourceId ?? 0) || 1

    const matchingDepartures = events
      .filter((event) => isSameMinute(event.start, startTime))
      .sort((a, b) => {
        const aLoad = a.totalOnBoat ?? a.peopleCount ?? 0
        const bLoad = b.totalOnBoat ?? b.peopleCount ?? 0
        return bLoad - aLoad
      })

    const targetDeparture = matchingDepartures[0]

    const boatId = targetDeparture
      ? Number(targetDeparture.resourceId) || fallbackBoatId
      : fallbackBoatId

    setSelectedSlotDetails({ start: startTime, boatId })
    setShowQuickBookModal(true)
  }

  const handleQuickBookingSuccess = () => {
    setShowQuickBookModal(false)
    mutate()
  }

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

      const bookingDateStr = format(departure, 'yyyy-MM-dd')
      const isLocked = Array.isArray(closures) && closures.some((c: any) => format(new Date(c.day), 'yyyy-MM-dd') === bookingDateStr && c.locked)
      if (isLocked) {
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
    [boatPlanModal, closures, mutate]
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
    newCheckinStatus?: string,
    newIsPaid?: boolean
  ) => {
    const bookingDateStr = format(selectedBooking?.start || new Date(), 'yyyy-MM-dd')
    const isLocked = Array.isArray(closures) && closures.some((c:any)=> format(new Date(c.day),'yyyy-MM-dd')===bookingDateStr && c.locked)
    if (isLocked) {
      alert('Période verrouillée: la journée est clôturée, modification impossible.')
      return
    }
    const body: any = {}
    if (newCheckinStatus) body.newCheckinStatus = newCheckinStatus
    if (newIsPaid !== undefined) body.newIsPaid = newIsPaid
    // If marking as paid and we have a selected payment method from details modal, include it
    if (newIsPaid === true && detailsMarkPaid?.provider) {
      body.paymentMethod = { provider: detailsMarkPaid.provider, methodType: detailsMarkPaid.provider==='voucher' ? detailsMarkPaid.methodType : undefined }
    }

    if (selectedBooking) {
      setSelectedBooking({
        ...selectedBooking,
        checkinStatus:
          newCheckinStatus !== undefined
            ? (newCheckinStatus as any)
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
    if (res.ok) mutate()
    else alert('Erreur mise à jour')
  }

  const handleDelete = async (id: string, title: string) => {
    const bookingDateStr = format(selectedBooking?.start || new Date(), 'yyyy-MM-dd')
    const isLocked = Array.isArray(closures) && closures.some((c:any)=> format(new Date(c.day),'yyyy-MM-dd')===bookingDateStr && c.locked)
    if (isLocked) { alert('Période verrouillée: suppression impossible (journée clôturée).'); return }
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
    const bookingDateStr = format(booking.start, 'yyyy-MM-dd')
    const isLocked = Array.isArray(closures) && closures.some((c:any)=> format(new Date(c.day),'yyyy-MM-dd')===bookingDateStr && c.locked)
    if (isLocked) { alert('Période verrouillée: modification d\'heure impossible (journée clôturée).'); return }
    try {
      const defaultTime = format(booking.start, 'HH:mm')
      const input = prompt('Nouvelle heure (HH:mm)', defaultTime) || ''
      const m = input.trim().match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return
      let hh = parseInt(m[1], 10)
      const mm = parseInt(m[2], 10)
      if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return

      const d = booking.start
      const utcStart = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0))

      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: utcStart.toISOString() })
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
    } catch (e) {
      console.error(e)
    }
  }

  const AddButtonWrapper = ({ children, value, resource }: any) => {
    const onClick = () => {
      const v = new Date(value)
      const startTime = new Date(
        Date.UTC(
          v.getFullYear(),
          v.getMonth(),
          v.getDate(),
          v.getHours(),
          v.getMinutes()
        )
      )
      const fallbackBoatId = Number(resource?.id ?? resource ?? 1) || 1

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

      setSelectedSlotDetails({ start: startTime, boatId: inferredBoatId })
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

  const ResourceHeader = ({ label }: { label: any }) => {
    const resource = resources.find((r) => r.title === label)
    return (
      <div
        className="text-center py-2 group cursor-pointer hover:bg-blue-50 transition rounded"
        onClick={() => resource && handleRenameBoat(resource.id, resource.title)}
        title="Changer le nom"
      >
        <div className="font-bold text-blue-900 text-lg flex justify-center items-center gap-2">
          {label}{' '}
          <span className="text-[10px] opacity-0 group-hover:opacity-100 text-slate-400">✏️</span>
        </div>
        <div className="text-xs text-slate-500 font-bold bg-blue-50 rounded-full px-2 py-0.5 inline-block border border-blue-100 mt-1">
          Max: {resource?.capacity || 12}
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
          pointerEvents: 'none' as 'none'
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
                    const statusBadgeClass =
                      status === 'NO_SHOW'
                        ? 'bg-amber-100 text-amber-700'
                        : status === 'EMBARQUED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
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
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusBadgeClass}`}
                          >
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
                            className={`rounded-full px-3 py-1 border transition ${
                              status === 'CONFIRMED'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                            } ${statusUpdating[booking.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            Confirmé
                          </button>
                          <button
                            type="button"
                            onClick={() => applyStatusChange(booking, 'EMBARQUED')}
                            disabled={statusUpdating[booking.id]}
                            className={`rounded-full px-3 py-1 border transition ${
                              status === 'EMBARQUED'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600'
                            } ${statusUpdating[booking.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            Embarqué
                          </button>
                          <button
                            type="button"
                            onClick={() => applyStatusChange(booking, 'NO_SHOW')}
                            disabled={statusUpdating[booking.id]}
                            className={`rounded-full px-3 py-1 border transition ${
                              status === 'NO_SHOW'
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-600'
                            } ${statusUpdating[booking.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
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

  const DetailsModal = ({ booking, onClose }: { booking: BookingDetails; onClose: () => void }) => {
    useEffect(() => {
      setDetailsMarkPaid(null)
    }, [booking.id])

    const displayedClientName = `${booking.user.firstName} ${booking.user.lastName}`
    const checkinStatus = (booking.checkinStatus || 'CONFIRMED') as BoardingStatus
    const statusTheme = STATUS_THEME[checkinStatus] ?? STATUS_THEME.CONFIRMED
    const bookingState = BOOKING_STATUS_THEME[booking.status] ?? BOOKING_STATUS_THEME.CONFIRMED
    const boatTitle = resources.find((resource) => Number(resource.id) === Number(booking.resourceId))?.title ?? `Barque ${booking.resourceId}`
    const languageFlag = booking.language ? LANGUAGE_FLAGS[booking.language] ?? booking.language : ''
    const languageLabel = booking.language ? `${languageFlag ? `${languageFlag} ` : ''}${booking.language}` : '—'
    const totalOnBoat = booking.totalOnBoat ?? booking.peopleCount ?? 0
    const loadPct = booking.boatCapacity ? Math.round((totalOnBoat / booking.boatCapacity) * 100) : null
    const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    const totalPriceLabel = priceFormatter.format(booking.totalPrice || 0)
    const message = (booking.message || '').trim()
    const statusOptions: BoardingStatus[] = ['CONFIRMED', 'EMBARQUED', 'NO_SHOW']
    const occupantBreakdown = [
      { label: 'Adultes', value: booking.adults || 0 },
      { label: 'Enfants', value: booking.children || 0 },
      { label: 'Bébés', value: booking.babies || 0 }
    ]

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 p-4">
        <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="relative">
            <div
              className="absolute inset-0 opacity-95"
              style={{ background: `linear-gradient(135deg, ${statusTheme.background}, ${statusTheme.backgroundSoft})` }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-4 px-6 py-5 text-white">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
                  <span>{boatTitle}</span>
                  <span className="hidden h-1 w-1 rounded-full bg-white/60 sm:inline" aria-hidden="true" />
                  <span>Départ {format(booking.start, 'dd/MM')}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-3 text-white">
                  <span className="text-3xl font-semibold leading-none">{format(booking.start, 'HH:mm')}</span>
                  <span className="text-sm font-medium uppercase tracking-wide text-white/75">
                    jusqu'à {format(booking.end, 'HH:mm')}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className="rounded-full bg-white/15 px-3 py-1">Check-in : {statusTheme.label}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1">Réservation : {bookingState.label}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1">{languageLabel}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-white/15 p-2 text-lg font-semibold leading-none text-white transition hover:bg-white/25"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="bg-slate-50">
            <div className="grid gap-6 p-6 lg:grid-cols-[280px,1fr]">
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Client</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{booking.user.role || 'Client'}</span>
                  </header>
                  <div className="mt-3 space-y-2">
                    <p className="text-lg font-semibold text-slate-900">{displayedClientName}</p>
                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">📧</span>
                        {booking.user.email ? (
                          <a href={`mailto:${booking.user.email}`} className="break-all text-blue-600 hover:underline">
                            {booking.user.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">Non renseigné</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">📞</span>
                        {booking.user.phone ? (
                          <a href={`tel:${booking.user.phone}`} className="text-blue-600 hover:underline">
                            {booking.user.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">Non renseigné</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Départ</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{languageLabel}</span>
                  </header>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{format(booking.start, 'dd/MM')}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Date</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">{format(booking.start, 'HH:mm')}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Départ</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">{format(booking.end, 'HH:mm')}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Retour estimé</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">{totalOnBoat} / {booking.boatCapacity}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Occupation</p>
                    </div>
                  </div>
                  {loadPct !== null && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>Charge</span>
                        <span>{Math.min(Math.max(loadPct, 0), 200)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${Math.min(Math.max(loadPct, 0), 110)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {occupantBreakdown.map((item) => (
                      <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                        <p className="text-lg font-semibold text-slate-900">{item.value}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                      </div>
                    ))}
                    <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-slate-900">{booking.peopleCount}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
                    </div>
                  </div>
                </section>

                {message && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm">
                    <header className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Note du client
                    </header>
                    <p className="mt-2 whitespace-pre-line leading-relaxed">{message}</p>
                  </section>
                )}
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut d'embarquement</p>
                      <p className="text-sm text-slate-500">Ajustez l'état pour synchroniser le planning.</p>
                    </div>
                    <span className={`rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold ${statusTheme.badge}`}>{statusTheme.label}</span>
                  </header>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {statusOptions.map((option) => {
                      const optionTheme = STATUS_THEME[option]
                      const isActive = checkinStatus === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            if (checkinStatus !== option) handleStatusUpdate(booking.id, option)
                          }}
                          disabled={isActive}
                          className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                            isActive
                              ? `${optionTheme.badge} border-transparent shadow-sm`
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
                          } ${isActive ? 'cursor-default opacity-90' : ''}`}
                        >
                          {optionTheme.label}
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paiement</p>
                      <p className="text-sm text-slate-500">Total dû : {totalPriceLabel}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        booking.isPaid
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {booking.isPaid ? 'Réglé' : 'À encaisser'}
                    </span>
                  </header>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    {Array.isArray(booking.payments) && booking.payments.length > 0 ? (
                      <ul className="space-y-2">
                        {booking.payments.map((p) => (
                          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="font-semibold text-slate-700">{p.provider}{p.methodType ? ` · ${p.methodType}` : ''}</span>
                            <span className="text-slate-500">
                              {(p.amount / 100).toFixed(2)} {p.currency} · {format(new Date(p.createdAt), 'dd/MM HH:mm')}
                            </span>
                            <span className="text-xs uppercase tracking-wide text-slate-400">{p.status}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs uppercase tracking-wide text-slate-400">Aucun règlement enregistré.</p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {booking.isPaid ? (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(booking.id, undefined, false)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        Marquer non payé
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDetailsMarkPaid({ provider: detailsMarkPaid?.provider ?? '', methodType: detailsMarkPaid?.methodType })}
                        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                      >
                        Enregistrer un paiement
                      </button>
                    )}
                  </div>
                  {!booking.isPaid && detailsMarkPaid && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Méthode utilisée</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                          value={detailsMarkPaid.provider}
                          onChange={(event) => {
                            const provider = event.target.value
                            setDetailsMarkPaid((prev) =>
                              prev
                                ? {
                                    provider,
                                    methodType: provider === 'voucher' ? prev.methodType ?? 'ANCV' : undefined
                                  }
                                : { provider, methodType: provider === 'voucher' ? 'ANCV' : undefined }
                            )
                          }}
                        >
                          <option value="">-- moyen --</option>
                          <option value="cash">Espèces</option>
                          <option value="card">Carte</option>
                          <option value="paypal">PayPal</option>
                          <option value="applepay">Apple Pay</option>
                          <option value="googlepay">Google Pay</option>
                          <option value="voucher">ANCV / CityPass</option>
                        </select>
                        {detailsMarkPaid.provider === 'voucher' && (
                          <select
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                            value={detailsMarkPaid.methodType ?? 'ANCV'}
                            onChange={(event) =>
                              setDetailsMarkPaid((prev) => (prev ? { ...prev, methodType: event.target.value } : prev))
                            }
                          >
                            <option value="ANCV">ANCV</option>
                            <option value="CityPass">CityPass</option>
                          </select>
                        )}
                        <button
                          type="button"
                          className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
                          onClick={async () => {
                            if (!detailsMarkPaid.provider) {
                              alert('Sélectionnez un moyen de paiement')
                              return
                            }
                            await handleStatusUpdate(booking.id, undefined, true)
                            setDetailsMarkPaid(null)
                            onClose()
                          }}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
                          onClick={() => setDetailsMarkPaid(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="text-xs font-semibold uppercase tracking-wide text-slate-500">Autres actions</header>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditTime(booking)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                    >
                      Modifier l'heure
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(booking.id, booking.clientName)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                    >
                      Supprimer la réservation
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
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
          <div className="flex-1 overflow-auto" style={{ ['--slotH' as any]: `${Math.round(40 * zoomLevel)}px` }}>
            <Calendar
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
              onDoubleClickEvent={(event: any) => handleDelete(event.id, event.clientName)}
              slotPropGetter={slotPropGetter}
              components={{ event: EventComponent, resourceHeader: ResourceHeader, timeSlotWrapper: AddButtonWrapper }}
              style={{ height: '100%' }}
              eventPropGetter={(event: any) => {
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

      {showDetailsModal && selectedBooking && (
        <DetailsModal booking={selectedBooking} onClose={() => setShowDetailsModal(false)} />
      )}

      {showQuickBookModal && selectedSlotDetails && (
        <QuickBookingModal
          slotStart={selectedSlotDetails.start}
          boatId={selectedSlotDetails.boatId}
          resources={resources}
          onClose={() => setShowQuickBookModal(false)}
          onSuccess={handleQuickBookingSuccess}
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
    </AdminPageShell>
  )
}
