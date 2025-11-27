'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay, isSameMinute } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logout } from '@/lib/actions'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import Link from 'next/link'
import QuickBookingModal from '@/components/QuickBookingModal'
import useSWR from 'swr'

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

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Erreur fetch')
  return res.json()
})

export default function ClientPlanningPage() {
  const [resources, setResources] = useState<BoatResource[]>([])
  const [loadingBoats, setLoadingBoats] = useState(true)
  const [compactZoom, setCompactZoom] = useState(false)

  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()))
  const [currentView, setCurrentView] = useState(Views.DAY as 'day' | 'week' | 'month' | 'work_week')
  const [currentRange, setCurrentRange] = useState({ start: startOfDay(new Date()), end: endOfDay(new Date()) })

  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsMarkPaid, setDetailsMarkPaid] = useState<{ provider: string, methodType?: string }|null>(null)

  const [selectedSlotDetails, setSelectedSlotDetails] = useState<{ start: Date; boatId: number } | null>(null)
  const [showQuickBookModal, setShowQuickBookModal] = useState(false)

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

  const handleNavigate = (date: Date) => setCurrentDate(date)
  const handleViewChange = (view: any) => setCurrentView(view)

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

  const handleSelectBooking = (event: BookingDetails) => {
    setSelectedBooking(event)
    setShowDetailsModal(true)
  }

  const handleSlotSelect = (slotInfo: any) => {
    const duration = new Date(slotInfo.end).getTime() - new Date(slotInfo.start).getTime()
    if (duration > 5 * 60 * 1000) return

    const s = new Date(slotInfo.start)
    const startTime = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), s.getHours(), s.getMinutes()))
    const boatId = slotInfo.resourceId

    const conflicts = events.some(
      (e) => e.resourceId === boatId && isSameMinute(e.start, startTime)
    )

    if (!conflicts) {
      setSelectedSlotDetails({ start: startTime, boatId: boatId || 1 })
      setShowQuickBookModal(true)
    }
  }

  const handleQuickBookingSuccess = () => {
    setShowQuickBookModal(false)
    mutate()
  }

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
      const boatId = resource?.id ?? resource ?? 1

      const hasConflict = events.some(
        (e) => e.resourceId === boatId && isSameMinute(e.start, startTime)
      )
      if (hasConflict) return

      setSelectedSlotDetails({ start: startTime, boatId })
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
    const flag = event.language === 'FR' ? '🇫🇷' : event.language === 'DE' ? '🇩🇪' : '🇬🇧'

    return (
      <div className="flex flex-col justify-between h-full w-full p-1 overflow-hidden group relative">
        <div className="absolute top-0 right-0 m-1">
          {(() => {
            const usage = event.boatCapacity > 0 ? event.totalOnBoat / event.boatCapacity : 0
            const style =
              usage >= 1
                ? 'bg-red-500 text-white'
                : usage >= 0.85
                ? 'bg-amber-500 text-black'
                : usage >= 0.5
                ? 'bg-green-500 text-white'
                : 'bg-white/20 text-white'
            return (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ring-1 ring-white/40 ${style}`}
                title={`Charge: ${event.totalOnBoat}/${event.boatCapacity}`}
              >
                {event.totalOnBoat}/{event.boatCapacity}p
              </span>
            )
          })()}
        </div>
        <div className="absolute bottom-0 right-0 m-1">
          {(() => {
            const remaining = Math.max(0, (event.boatCapacity || 0) - (event.totalOnBoat || 0))
            const style =
              remaining === 0
                ? 'bg-red-500 text-white'
                : remaining <= 2
                ? 'bg-amber-500 text-black'
                : 'bg-white/30 text-white'
            return (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 ring-white/40 ${style}`}
                title={`Places restantes: ${remaining}`}
              >
                {remaining} rest.
              </span>
            )
          })()}
        </div>
        <div className="flex justify-start items-start leading-tight pr-5">
          <span className="font-bold text-[11px] whitespace-normal break-words">
            {flag} {displayName}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(event.id, event.clientName)
            }}
            className="absolute top-0 right-0 text-white/60 hover:text-white hover:bg-red-500/60 rounded px-1 text-[10px] opacity-0 group-hover:opacity-100 transition"
            aria-label="Supprimer"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0 text-[10px] font-medium opacity-90 mt-0.5">
          {event.adults > 0 && <span>{event.adults}Ad</span>}
          {event.children > 0 && <span>{event.children}En</span>}
          {event.babies > 0 && <span>{event.babies}Bé</span>}
        </div>
        <div className="flex items-center gap-1 mt-auto pt-1">
          <div
            className={`w-2 h-2 rounded-full ${event.isPaid ? 'bg-green-400' : 'bg-red-500'} ring-1 ring-white/40`}
            title={event.isPaid ? 'Payé' : 'Non Payé'}
          />
          <span className="text-[10px] font-bold ml-auto">{event.peopleCount}p</span>
        </div>
      </div>
    )
  }

  const slotPropGetter = (date: Date) => {
    const m = date.getHours() * 60 + date.getMinutes()
    if (m >= 705 && m < 810) {
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

  const DetailsModal = ({ booking, onClose }: { booking: BookingDetails; onClose: () => void }) => {
    if (!booking) return null
    const displayedClientName = `${booking.user.firstName} ${booking.user.lastName}`

    return (
      <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
          <div className="p-5 border-b flex justify-between items-center bg-blue-50 rounded-t-xl">
            <h3 className="text-xl font-bold text-blue-900">Détails {format(booking.start, 'HH:mm')}</h3>
            <button onClick={onClose} className="text-xl text-slate-500 hover:text-black">
              ✕
            </button>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-4 pt-2 text-center text-sm">
              <div>
                <p className="font-bold text-slate-800">{format(booking.start, 'dd/MM')}</p>
                <p className="text-xs text-slate-500">Date</p>
              </div>
              <div>
                <p className="font-bold text-blue-600">{format(booking.start, 'HH:mm')}</p>
                <p className="text-xs text-slate-500">Départ</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">{booking.peopleCount}p</p>
                <p className="text-xs text-slate-500">({booking.language})</p>
              </div>
            </div>
            <div className="border p-3 rounded bg-slate-50">
              <p className="font-bold text-lg text-slate-800">{displayedClientName}</p>
              <p className="text-sm text-slate-600">📧 {booking.user.email}</p>
              <p className="text-sm text-slate-600">📞 {booking.user.phone || 'N/A'}</p>
            </div>

            {booking.message && (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800">
                <strong>Note / Commentaire :</strong>
                <br />
                {booking.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-center">
              <div
                className={`p-2 rounded border ${booking.isPaid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
              >
                <p className="text-xs font-bold uppercase">Paiement</p>
                <p className="font-bold">{booking.isPaid ? 'RÉGLÉ' : 'NON PAYÉ'} ({booking.totalPrice}€)</p>
              </div>
              <div
                className={`p-2 rounded border ${booking.checkinStatus === 'EMBARQUED' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              >
                <p className="text-xs font-bold uppercase">Statut</p>
                <p className="font-bold">{booking.checkinStatus}</p>
              </div>
            </div>

            {booking.payments && booking.payments.length > 0 && (
              <div className="mt-3 p-3 rounded border bg-white">
                <p className="text-xs font-bold uppercase text-slate-500">Détails Paiement</p>
                <ul className="mt-1 text-sm text-slate-700 list-disc pl-4">
                  {booking.payments.map((p) => (
                    <li key={p.id}>
                      {p.provider}{p.methodType ? ` (${p.methodType})` : ''} • {(p.amount/100).toFixed(2)} {p.currency} • {p.status}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="p-5 flex flex-wrap justify-end gap-2 border-t bg-gray-50 rounded-b-xl">
            <button
              onClick={() => {
                if (!booking.isPaid) {
                  setDetailsMarkPaid({ provider: '', methodType: undefined })
                } else {
                  handleStatusUpdate(booking.id, undefined, false)
                }
              }}
              className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-blue-700"
            >
              {booking.isPaid ? 'Marquer Non Payé' : 'Marquer Payé'}
            </button>
            {detailsMarkPaid && (
              <div className="w-full mt-2 p-2 border rounded bg-white">
                <div className="text-xs mb-1">Sélectionnez le moyen de paiement</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select className="border rounded px-2 py-1" value={detailsMarkPaid.provider} onChange={e=>{
                    const val = e.target.value
                    setDetailsMarkPaid(prev=> prev ? { ...prev, provider: val, methodType: (val==='voucher' ? (prev.methodType||'ANCV') : undefined) } : null)
                  }}>
                    <option value="">-- moyen --</option>
                    <option value="cash">Espèces</option>
                    <option value="card">Carte</option>
                    <option value="paypal">PayPal</option>
                    <option value="applepay">Apple Pay</option>
                    <option value="googlepay">Google Pay</option>
                    <option value="voucher">ANCV / CityPass</option>
                  </select>
                  {detailsMarkPaid.provider==='voucher' && (
                    <select className="border rounded px-2 py-1" value={detailsMarkPaid.methodType||'ANCV'} onChange={e=> setDetailsMarkPaid(prev=> prev ? { ...prev, methodType: e.target.value } : prev)}>
                      <option value="ANCV">ANCV</option>
                      <option value="CityPass">CityPass</option>
                    </select>
                  )}
                  <button className="border rounded px-2 py-1 bg-green-600 text-white" onClick={async ()=>{
                    if (!detailsMarkPaid.provider) { alert('Sélectionnez un moyen de paiement'); return }
                    await handleStatusUpdate(booking.id, undefined, true)
                    setDetailsMarkPaid(null)
                    setShowDetailsModal(false)
                  }}>Valider</button>
                  <button className="border rounded px-2 py-1" onClick={()=> setDetailsMarkPaid(null)}>Annuler</button>
                </div>
              </div>
            )}
            {booking.checkinStatus === 'CONFIRMED' && (
              <>
                <button
                  onClick={() => handleStatusUpdate(booking.id, 'EMBARQUED')}
                  className="bg-green-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-green-700"
                >
                  Embarquer
                </button>
                <button
                  onClick={() => handleStatusUpdate(booking.id, 'NO_SHOW')}
                  className="bg-orange-500 text-white px-3 py-2 rounded font-bold text-sm hover:bg-orange-600"
                >
                  Non Show
                </button>
              </>
            )}
            {(booking.checkinStatus === 'EMBARQUED' || booking.checkinStatus === 'NO_SHOW') && (
              <button
                onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')}
                className="bg-slate-500 text-white px-3 py-2 rounded font-bold text-sm hover:bg-slate-600"
              >
                Annuler Statut
              </button>
            )}
            <button
              onClick={() => handleEditTime(booking)}
              className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded font-bold text-sm hover:bg-slate-50"
            >
              Heure
            </button>
            <button
              onClick={() => handleDelete(booking.id, booking.clientName)}
              className="bg-red-100 text-red-600 px-3 py-2 rounded font-bold text-sm hover:bg-red-200"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen p-6 bg-slate-50 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-1 inline-block">
              ← Tableau de Bord
            </Link>
            <h1 className="text-2xl font-bold text-blue-900">Planning 🛶</h1>
            <p className="text-sm text-slate-500">
              {loadingBoats ? 'Chargement des barques...' : 'Cliquez sur une case vide pour ajouter une réservation.'}
            </p>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
              !rawBookings && !error
                ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
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
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => mutate()}
            className="px-4 py-2 bg-white border shadow-sm rounded hover:bg-slate-50 text-sm font-bold text-slate-600 transition"
          >
            Actualiser 🔄
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Zoom</span>
            <button
              onClick={() => setCompactZoom(false)}
              className={`px-2 py-1 rounded text-sm font-bold border ${
                !compactZoom ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700'
              }`}
              title="Vue standard"
            >
              100%
            </button>
            <button
              onClick={() => setCompactZoom(true)}
              className={`px-2 py-1 rounded text-sm font-bold border ${
                compactZoom ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700'
              }`}
              title="Vue compacte (journée entière)"
            >
              Compacte
            </button>
          </div>
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-red-50 border border-red-100 shadow-sm rounded hover:bg-red-100 text-sm font-bold text-red-600 transition flex items-center gap-2"
          >
            Déconnexion 🚪
          </button>
        </div>
      </div>

      <div className={`flex-1 bg-white border rounded-xl shadow-sm p-4 ${compactZoom ? 'sn-compact' : ''}`}>
        {!loadingBoats && resources.length === 0 ? (
          <div className="h-full flex items-center justify-center text-red-500 font-bold">
            ⚠️ Aucune barque trouvée. Relancez le seed.
          </div>
        ) : (
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
            view={currentView}
            onView={handleViewChange}
            defaultView={Views.DAY}
            views={['day', 'work_week', 'month']}
            resources={resources}
            resourceIdAccessor="id"
            resourceTitleAccessor="title"
            step={5}
            timeslots={1}
            min={new Date(0, 0, 0, 9, 0, 0)}
            max={new Date(0, 0, 0, 18, 30, 0)}
            culture="fr"
            onDoubleClickEvent={(event: any) => handleDelete(event.id, event.clientName)}
            slotPropGetter={slotPropGetter}
            components={{ event: EventComponent, resourceHeader: ResourceHeader, timeSlotWrapper: AddButtonWrapper }}
            eventPropGetter={(event: any) => {
              let style = {
                color: 'white',
                backgroundColor: '#2563eb',
                border: '1px solid rgba(255,255,255,0.6)',
                borderRadius: '6px'
              }
              if (event.checkinStatus === 'EMBARQUED') style.backgroundColor = '#1f4068'
              else if (event.checkinStatus === 'NO_SHOW') {
                style.backgroundColor = '#e69900'
                style.color = 'black'
              } else if (event.resourceId === 2) style.backgroundColor = '#008b8b'
              else if (event.resourceId === 3) style.backgroundColor = '#7c3aed'
              else if (event.resourceId === 4) style.backgroundColor = '#d97706'
              return { style }
            }}
          />
        )}
      </div>

      <style jsx>{`
        .sn-compact :global(.rbc-time-slot) { height: 6px; }
        .sn-compact :global(.rbc-time-gutter .rbc-time-slot) { height: 6px; }
        .sn-compact :global(.rbc-timeslot-group) { border-bottom-width: 0; }
        .sn-compact :global(.rbc-time-content) { height: auto; overflow: hidden; }
        .sn-compact :global(.rbc-time-header) { font-size: 11px; }
        .sn-compact :global(.rbc-event) { padding: 2px 4px; }
        .sn-compact :global(.rbc-label) { font-size: 9px; line-height: 1; }
        .sn-compact :global(.rbc-row) { min-height: 0; }
        .sn-compact :global(.rbc-time-view) { overflow: hidden; }
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
    </div>
  )
}
