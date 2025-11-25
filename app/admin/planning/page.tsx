'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay, isSameMinute } from 'date-fns'
// 👇 CORRECTION ICI : Import nommé depuis 'date-fns/locale'
import { fr } from 'date-fns/locale'
import { logout } from '@/lib/actions'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import Link from 'next/link'
import QuickBookingModal from '@/components/QuickBookingModal'
import useSWR from 'swr'

// --- CONFIGURATION ---
const locales = { 'fr': fr }
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales
})

// --- TYPES ---
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
  totalOnBoat: number;
  boatCapacity: number;
  user: UserData;
  language: string;
  totalPrice: number;
  checkinStatus: 'CONFIRMED' | 'EMBARQUED' | 'NO_SHOW'
  isPaid: boolean;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
}

// 1. DÉFINITION DU FETCHER SWR
const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error("Erreur fetch")
    return res.json()
})

export default function AdminPlanning() {
  const [resources, setResources] = useState<BoatResource[]>([])
  const [loadingBoats, setLoadingBoats] = useState(true)
  
  // Navigation & Vue
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date())) 
  const [currentView, setCurrentView] = useState(Views.DAY as ('day' | 'week' | 'month' | 'work_week'))
  const [currentRange, setCurrentRange] = useState({ start: startOfDay(new Date()), end: endOfDay(new Date()) })
  
  // Modales
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  
  const [selectedSlotDetails, setSelectedSlotDetails] = useState<{ start: Date, boatId: number } | null>(null)
  const [showQuickBookModal, setShowQuickBookModal] = useState(false)
  
  // --- 1. SWR HOOK ---
  const apiUrl = `/api/admin/all-bookings?start=${currentRange.start.toISOString()}&end=${currentRange.end.toISOString()}`

  const { data: rawBookings, error, mutate } = useSWR(apiUrl, fetcher, {
      refreshInterval: 10000,
      revalidateOnFocus: true,
      keepPreviousData: true,
  })

  // --- 2. TRANSFORMATION DES DONNÉES ---
  const events = useMemo(() => {
      if (!rawBookings || !Array.isArray(rawBookings)) return []

      const loadMap: Record<string, number> = {}
      rawBookings.forEach((b: any) => {
        const key = `${b.startTime}_${b.boatId}`
        loadMap[key] = (loadMap[key] || 0) + b.numberOfPeople
      })

      return rawBookings.map((b: any) => {
        const fullName = `${b.user.firstName} ${b.user.lastName}`
        const startDate = new Date(b.startTime)
        const endDate = new Date(b.endTime)

        if (isNaN(startDate.getTime())) return null

        return {
          id: b.id, title: fullName, start: startDate, end: endDate,     
          resourceId: b.boatId, peopleCount: b.numberOfPeople,
          boatCapacity: b.boat.capacity, totalOnBoat: loadMap[`${b.startTime}_${b.boatId}`] || 0,
          user: b.user, language: b.language, totalPrice: b.totalPrice,
          checkinStatus: b.checkinStatus, isPaid: b.isPaid, status: b.status,
        }
      }).filter((event: any) => event !== null) as BookingDetails[]
  }, [rawBookings]) 


  // --- 3. CHARGEMENT DES RESSOURCES ---
  const fetchBoats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/boats')
      if (!res.ok) throw new Error("Erreur API")
      const data = await res.json()
      setResources(data)
    } catch (e) { console.error("Erreur chargement barques", e) } 
    finally { setLoadingBoats(false) }
  }, [])

  useEffect(() => { fetchBoats() }, [fetchBoats])


  // --- 4. HANDLERS ---
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
    const duration = new Date(slotInfo.end).getTime() - new Date(slotInfo.start).getTime();
    if (duration > 5 * 60 * 1000) return; 

    const startTime = slotInfo.start
    const boatId = slotInfo.resourceId

    const conflicts = events.some(e => 
        e.resourceId === boatId && isSameMinute(e.start, startTime)
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


  // --- 5. ACTIONS CRUD ---
  const handleRenameBoat = async (boatId: number, currentName: string) => {
    const newName = prompt(`Nom du batelier pour la barque ${boatId} ?`, currentName)
    if (newName && newName !== currentName) {
      await fetch('/api/admin/boats', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: boatId, name: newName }) })
      fetchBoats()
    }
  }

  const handleStatusUpdate = async (id: string, newCheckinStatus?: string, newIsPaid?: boolean) => {
    const body: any = {}
    if (newCheckinStatus) body.newCheckinStatus = newCheckinStatus
    if (newIsPaid !== undefined) body.newIsPaid = newIsPaid
    
    if(selectedBooking) {
        setSelectedBooking({
             ...selectedBooking,
             checkinStatus: newCheckinStatus !== undefined ? newCheckinStatus as any : selectedBooking.checkinStatus,
             isPaid: newIsPaid !== undefined ? newIsPaid : selectedBooking.isPaid 
        })
    }

    const res = await fetch(`/api/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    
    if (res.ok) mutate() 
    else alert("Erreur mise à jour")
  }

  const handleDelete = async (id: string, title: string) => {
    if(!confirm(`ANNULER la réservation de ${title} ?`)) return
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    if (res.status === 401) { alert("Session expirée."); await logout(); return; }
    if (res.ok) {
        mutate()
        setShowDetailsModal(false)
    } else { alert("Erreur suppression") }
  }

  const handleEditTime = async (event: BookingDetails) => {
    const currentHour = format(event.start, 'HH:mm')
    const newTime = prompt(`Nouvelle heure (HH:mm) ?`, currentHour)
    if (newTime && newTime !== currentHour) {
        const [h, m] = newTime.split(':')
        const newDate = new Date(event.start); newDate.setHours(parseInt(h), parseInt(m))
        const res = await fetch(`/api/bookings/${event.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: newDate.toISOString() }) })
        if (res.ok) mutate() 
        else alert("Erreur (Conflit ?)")
    }
  }


  // --- 6. COMPOSANTS VISUELS ---
  const AddButtonWrapper = ({ children }: any) => {
      return (
          <div className="h-full w-full relative group cursor-pointer hover:bg-blue-50/50 transition-colors flex items-center justify-center">
              {children}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <span className="text-blue-400 text-lg font-bold select-none">+</span>
              </div>
          </div>
      )
  }

  const ResourceHeader = ({ label }: { label: string }) => {
    const resource = resources.find(r => r.title === label)
    return (
      <div className="text-center py-2 group cursor-pointer hover:bg-blue-50 transition rounded"
           onClick={() => resource && handleRenameBoat(resource.id, resource.title)} title="Changer le nom">
        <div className="font-bold text-blue-900 text-lg flex justify-center items-center gap-2">
           {label} <span className="text-[10px] opacity-0 group-hover:opacity-100 text-slate-400">✏️</span>
        </div>
        <div className="text-xs text-slate-500 font-bold bg-blue-50 rounded-full px-2 py-0.5 inline-block border border-blue-100 mt-1">
           Max: {resource?.capacity || 12}
        </div>
      </div>
    )
  }

  const EventComponent = ({ event }: { event: BookingDetails }) => {
    const isFull = event.totalOnBoat >= event.boatCapacity
    const isEmbarked = event.checkinStatus === 'EMBARQUED'
    const isNoShow = event.checkinStatus === 'NO_SHOW'
    const paymentDotColor = event.isPaid ? 'bg-green-500' : 'bg-red-500'

    return (
      <div className={`relative flex justify-between items-start h-full px-1 overflow-hidden ${isFull ? 'bg-red-500/10' : ''}`}
          style={{ backgroundColor: isEmbarked ? '#1f4068' : isNoShow ? '#e69900' : undefined }}>
          
          <div className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full shadow ${paymentDotColor}`}></div>
          <div className="flex flex-col leading-tight overflow-hidden pt-1 pl-3">
              <span className="text-xs font-bold truncate" style={{color: isNoShow ? 'black' : 'white'}}>{event.title}</span>
              <span className="text-[10px] opacity-90" style={{color: isNoShow ? 'black' : 'white'}}>({event.peopleCount}p)</span>
              <span className={`text-[9px] font-bold mt-0.5 ${isEmbarked || isNoShow ? 'text-white' : 'opacity-70'}`} style={{color: isNoShow ? 'black' : 'white'}}>⚓ {event.totalOnBoat}/{event.boatCapacity}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id, event.clientName) }}
              className="text-white hover:text-red-300 font-bold px-1.5 ml-1 text-sm bg-black/10 rounded hover:bg-black/30 transition">✕</button>
      </div>
    )
  }

  const slotPropGetter = (date: Date) => {
    const m = date.getHours() * 60 + date.getMinutes()
    if (m > 12 * 60 + 15 && m < 13 * 60 + 30) { 
      return { style: { backgroundColor: '#f3f4f6', backgroundImage: 'repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px', opacity: 0.5, pointerEvents: 'none' as 'none' } }
    }
    return {}
  }

  const DetailsModal = ({ booking, onClose }: { booking: BookingDetails, onClose: () => void }) => {
    if (!booking) return null
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-5 border-b flex justify-between items-center bg-blue-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-blue-900">Détails {format(booking.start, 'HH:mm')}</h3>
                    <button onClick={onClose} className="text-xl text-slate-500 hover:text-black">✕</button>
                </div>
                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-3 gap-4 pt-2 text-center text-sm">
                        <div><p className="font-bold text-slate-800">{format(booking.start, 'dd/MM')}</p><p className="text-xs text-slate-500">Date</p></div>
                        <div><p className="font-bold text-blue-600">{format(booking.start, 'HH:mm')}</p><p className="text-xs text-slate-500">Départ</p></div>
                        <div><p className="font-bold text-slate-800">{booking.peopleCount}p</p><p className="text-xs text-slate-500">({booking.language})</p></div>
                    </div>
                    <div className="border p-3 rounded bg-slate-50">
                        <p className="font-bold text-lg text-slate-800">{booking.clientName}</p>
                        <p className="text-sm text-slate-600">📧 {booking.user.email}</p>
                        <p className="text-sm text-slate-600">📞 {booking.user.phone || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className={`p-2 rounded border ${booking.isPaid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            <p className="text-xs font-bold uppercase">Paiement</p>
                            <p className="font-bold">{booking.isPaid ? 'RÉGLÉ' : 'NON PAYÉ'} ({booking.totalPrice}€)</p>
                        </div>
                        <div className={`p-2 rounded border ${booking.checkinStatus === 'EMBARQUED' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                            <p className="text-xs font-bold uppercase">Statut</p>
                            <p className="font-bold">{booking.checkinStatus}</p>
                        </div>
                    </div>
                </div>
                <div className="p-5 flex flex-wrap justify-end gap-2 border-t bg-gray-50 rounded-b-xl">
                    <button onClick={() => handleStatusUpdate(booking.id, undefined, !booking.isPaid)} className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-blue-700">
                        {booking.isPaid ? 'Marquer Non Payé' : 'Marquer Payé'}
                    </button>
                    {booking.checkinStatus === 'CONFIRMED' && (
                        <>
                            <button onClick={() => handleStatusUpdate(booking.id, 'EMBARQUED')} className="bg-green-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-green-700">Embarquer</button>
                            <button onClick={() => handleStatusUpdate(booking.id, 'NO_SHOW')} className="bg-orange-500 text-white px-3 py-2 rounded font-bold text-sm hover:bg-orange-600">Non Show</button>
                        </>
                    )}
                    {(booking.checkinStatus === 'EMBARQUED' || booking.checkinStatus === 'NO_SHOW') && (
                        <button onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')} className="bg-slate-500 text-white px-3 py-2 rounded font-bold text-sm hover:bg-slate-600">Annuler Statut</button>
                    )}
                    <button onClick={() => handleEditTime(booking)} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded font-bold text-sm hover:bg-slate-50">Heure</button>
                    <button onClick={() => handleDelete(booking.id, booking.clientName)} className="bg-red-100 text-red-600 px-3 py-2 rounded font-bold text-sm hover:bg-red-200">Supprimer</button>
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
                <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-1 inline-block">← Tableau de Bord</Link>
                <h1 className="text-2xl font-bold text-blue-900">Planning 🛶</h1>
                <p className="text-sm text-slate-500">
                  {loadingBoats ? "Chargement des barques..." : "Cliquez sur une case vide pour ajouter une réservation."}
                </p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${!rawBookings && !error ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                {!rawBookings && !error ? (
                     <>⏳ Chargement...</>
                ) : (
                     <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span> LIVE</>
                )}
            </div>
        </div>
        <div className="flex gap-3">
            <button onClick={() => mutate()} className="px-4 py-2 bg-white border shadow-sm rounded hover:bg-slate-50 text-sm font-bold text-slate-600 transition">Actualiser 🔄</button>
            <button onClick={() => logout()} className="px-4 py-2 bg-red-50 border border-red-100 shadow-sm rounded hover:bg-red-100 text-sm font-bold text-red-600 transition flex items-center gap-2">Déconnexion 🚪</button>
        </div>
      </div>
      
      <div className="flex-1 bg-white border rounded-xl shadow-sm p-4">
        {!loadingBoats && resources.length === 0 ? (
            <div className="h-full flex items-center justify-center text-red-500 font-bold">⚠️ Aucune barque trouvée. Relancez le seed.</div>
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
            min={new Date(0, 0, 0, 8, 0, 0)} 
            max={new Date(0, 0, 0, 19, 0, 0)} 
            culture='fr'
            onDoubleClickEvent={(event: any) => handleDelete(event.id, event.clientName)}
            slotPropGetter={slotPropGetter}
            components={{ event: EventComponent, resourceHeader: ResourceHeader, timeSlotWrapper: AddButtonWrapper }}
            eventPropGetter={(event: any) => {
                 let style = { color: 'white', backgroundColor: '#2563eb' };
                 if (event.checkinStatus === 'EMBARQUED') style.backgroundColor = '#1f4068';
                 else if (event.checkinStatus === 'NO_SHOW') { style.backgroundColor = '#e69900'; style.color = 'black'; }
                 else if (event.resourceId === 2) style.backgroundColor = '#008b8b';
                 else if (event.resourceId === 3) style.backgroundColor = '#7c3aed';
                 else if (event.resourceId === 4) style.backgroundColor = '#d97706';
                 return { style: {...style, borderRadius: '6px', border: 'none'} };
             }}
            />
        )}
      </div>

      {showDetailsModal && selectedBooking && <DetailsModal booking={selectedBooking} onClose={() => setShowDetailsModal(false)} />}
      
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