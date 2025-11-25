'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay, addMinutes, areIntervalsOverlapping } from 'date-fns'
import fr from 'date-fns/locale/fr'
import { logout } from '@/lib/actions'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import Link from 'next/link'
import QuickBookingModal from '@/components/QuickBookingModal'; 

// --- CONFIGURATION DE BASE ---
const locales = { 'fr': fr }
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales
})
const TOUR_DURATION = 25; 
const BUFFER_TIME = 5;

// --- TYPES & INTERFACES ---
interface BoatResource { id: number; title: string; capacity: number }
interface UserData { firstName: string; lastName: string; email: string; phone: string; role: string; }

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
    checkinStatus: 'CONFIRMED' | 'EMBARQUED' | 'NO_SHOW';
    isPaid: boolean;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export default function AdminPlanning() {
  const [events, setEvents] = useState<BookingDetails[]>([])
  const [resources, setResources] = useState<BoatResource[]>([])
  const [loadingBoats, setLoadingBoots] = useState(true)
  
  // États de la Modale et de la navigation
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date())) 
  const [currentRange, setCurrentRange] = useState({ start: startOfDay(new Date()), end: endOfDay(new Date()) })
  const [currentView, setCurrentView] = useState(Views.DAY as ('day' | 'week' | 'month' | 'work_week')); 
  
  // États pour la Réservation Rapide
  const [selectedSlotDetails, setSelectedSlotDetails] = useState<{ start: Date, boatId: number } | null>(null);
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  
  const [refreshKey, setRefreshKey] = useState(0); 


  // --- 1. CHARGEMENT DES DONNÉES ---

  const fetchBoats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/boats')
      if (!res.ok) throw new Error("Erreur API")
      const data = await res.json()
      setResources(data)
    } catch (e) { console.error("Erreur chargement barques", e); alert("Impossible de charger les barques.") } 
    finally { setLoadingBoots(false) }
  }, [])

  const fetchBookings = async (start: Date, end: Date) => {
    try {
      const startStr = start.toISOString()
      const endStr = end.toISOString()
      
      const res = await fetch(`/api/admin/all-bookings?start=${startStr}&end=${endStr}&t=${Date.now()}`) 
      const rawData = await res.json()
      
      const loadMap: Record<string, number> = {}
      rawData.forEach((b: any) => {
        const key = `${b.startTime}_${b.boatId}`
        loadMap[key] = (loadMap[key] || 0) + b.numberOfPeople
        
      })

      const formattedEvents = rawData.map((b: any) => {
        const fullName = `${b.user.firstName} ${b.user.lastName}`
        
        const startDate = new Date(b.startTime);
        const endDate = new Date(b.endTime);

        if (isNaN(startDate.getTime())) return null; 

        return {
          id: b.id, title: fullName, start: startDate, end: endDate,     
          resourceId: b.boatId, peopleCount: b.numberOfPeople,
          boatCapacity: b.boat.capacity, totalOnBoat: loadMap[`${b.startTime}_${b.boatId}`] || 0,
          user: b.user, language: b.language, totalPrice: b.totalPrice,
          checkinStatus: b.checkinStatus, isPaid: b.isPaid, status: b.status,
        }
      }).filter((event: any) => event !== null) as BookingDetails[]
      
      setEvents(formattedEvents)
    } catch (e) { console.error("Erreur auto-refresh", e) }
  }


  // Chargement initial & Polling
  useEffect(() => {
    fetchBoats()
    const intervalId = setInterval(() => { fetchBookings(currentRange.start, currentRange.end) }, 10000)
    return () => clearInterval(intervalId)
  }, [fetchBoats]) 

  // Dépendance du Fetch (sur range change ou refreshKey)
  useEffect(() => {
      fetchBookings(currentRange.start, currentRange.end);
  }, [currentRange, refreshKey]);


  // --- 2. ACTIONS CRUD (Définies ici pour être passées à la modale) ---

  const handleRenameBoat = async (boatId: number, currentName: string) => {
    const newName = prompt(`Nom du batelier pour la barque ${boatId} ?`, currentName)
    if (newName && newName !== currentName) {
      try {
        const res = await fetch('/api/admin/boats', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: boatId, name: newName }) })
        if (res.ok) fetchBoats()
      } catch (e) { alert("Erreur technique") }
    }
  }

  // Mise à jour du statut Check-in / Paiement
  const handleStatusUpdate = async (id: string, newCheckinStatus?: string, newIsPaid?: boolean) => {
    const body: any = {};
    if (newCheckinStatus) body.newCheckinStatus = newCheckinStatus;
    if (newIsPaid !== undefined) body.newIsPaid = newIsPaid;
    
    try {
        const res = await fetch(`/api/bookings/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // NOUVELLE GESTION DE LA SÉCURITÉ/SESSION
        if (res.status === 401 || res.status === 403) {
             alert("Erreur de sécurité. Votre session a expiré. Veuillez vous reconnecter.");
             await logout();
             return; 
        }

        if (res.ok) {
            setRefreshKey(prev => prev + 1); // Force refresh
            setSelectedBooking(prev => {
                if (!prev) return null;
                return { 
                    ...prev, 
                    checkinStatus: newCheckinStatus !== undefined ? newCheckinStatus as any : prev.checkinStatus,
                    isPaid: newIsPaid !== undefined ? newIsPaid : prev.isPaid 
                }
            });
        } else {
            alert("Erreur de mise à jour du statut.");
        }
    } catch (e) {
        alert("Échec de la connexion API.");
    }
  };

  const handleEditTime = async (event: BookingDetails) => {
    const currentHour = format(event.start, 'HH:mm')
    const newTime = prompt(`Déplacer ${event.clientName} ? (HH:mm)`, currentHour)
    if (newTime && newTime !== currentHour) {
      const [hours, minutes] = newTime.split(':')
      const newStartDate = new Date(event.start)
      newStartDate.setHours(parseInt(hours), parseInt(minutes))
      try {
        const res = await fetch(`/api/bookings/${event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start: newStartDate.toISOString() })
        })
        if (res.ok) setRefreshKey(prev => prev + 1); // Force refresh
        else {
            const err = await res.json()
            alert("Erreur : " + (err.error || "Impossible"))
        }
      } catch (e) { alert("Erreur technique") }
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if(!confirm(`ANNULER la réservation de ${title} ?`)) return
    try {
        const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
        
        if (res.status === 401 || res.status === 403) {
             alert("Erreur de sécurité. Votre session a expiré. Veuillez vous reconnecter.");
             await logout();
             return; 
        }

        if (res.ok) {
            setRefreshKey(prev => prev + 1); // Force refresh
            setShowDetailsModal(false);
        } else {
            alert("Erreur de suppression: L'API a retourné une erreur interne.");
        }
    } catch (e) { alert("Erreur suppression") }
  }


  // --- 3. GESTION NAVIGATION & MODALE D'OUVERTURE ---

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: any) => {
      setCurrentView(newView);
  }

  const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
    let startDate: Date, endDate: Date
    if (Array.isArray(range)) {
      startDate = startOfDay(range[0])
      endDate = endOfDay(range[range.length - 1])
    } else {
      startDate = startOfDay(range.start)
      endDate = endOfDay(range.end)
    }
    // Mise à jour de l'état currentRange -> Déclenchement de l'useEffect (polling)
    setCurrentRange({ start: startDate, end: endDate })
  }
  
  const handleSelectBooking = (event: BookingDetails) => {
    setSelectedBooking(event);
    setShowDetailsModal(true);
  };

  const handleSlotSelect = (slotInfo: any) => {
    const startTime = slotInfo.start;
    const boatId = slotInfo.resourceId; 

    // BLOQUE SI GLISSER-DÉPOSER
    if (slotInfo.slots.length > 1) {
        return; 
    }
    
    // Vérifie si le slot est déjà pris
    const conflicts = events.some(e => 
        isSameMinute(e.start, startTime)
    );
    
    if (!conflicts) {
        setSelectedSlotDetails({
            start: startTime,
            boatId: 1 
        });
        setShowQuickBookModal(true);
    }
  };

  /**
   * Fonction passée à QuickBookingModal pour forcer le rafraîchissement
   */
  const handleQuickBookingSuccess = () => {
      setShowQuickBookModal(false);
      // Incrémente la clé pour forcer le useEffect (polling) à se re-fetch immédiatement
      setRefreshKey(prev => prev + 1); 
  };


  // --- 4. COMPOSANTS VISUELS ---

  const ResourceHeader = ({ label }: { label: string }) => {
    const resource = resources.find(r => r.title === label)
    return (
      <div className="text-center py-2 group cursor-pointer hover:bg-blue-50 transition rounded"
           onClick={() => resource && handleRenameBoat(resource.id, resource.title)}
           title="Cliquez pour changer le nom">
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
    const isEmbarked = event.checkinStatus === 'EMBARQUED';
    const isNoShow = event.checkinStatus === 'NO_SHOW';
    
    const paymentDotColor = event.isPaid ? 'bg-green-500' : 'bg-red-500';

    return (
      <div className={`relative flex justify-between items-start h-full px-1 overflow-hidden 
          ${isFull ? 'bg-red-500/10' : ''}`}
          style={{ backgroundColor: isEmbarked ? '#1f4068' : isNoShow ? '#e69900' : undefined}} 
      >
          <div className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full shadow ${paymentDotColor}`}></div>

          <div className="flex flex-col leading-tight overflow-hidden pt-1">
              <span className="text-xs font-bold truncate" title={event.title} style={{marginLeft: '10px', color: isNoShow ? 'black' : 'white'}}>{event.title}</span>
              <span className="text-[10px] opacity-90" style={{color: isNoShow ? 'black' : 'white'}}>({event.peopleCount}p)</span>
              <span className={`text-[9px] font-bold mt-0.5 ${isEmbarked || isNoShow ? 'text-white' : 'opacity-70'}`} style={{color: isNoShow ? 'black' : 'white'}}>
                 ⚓ {event.totalOnBoat}/{event.boatCapacity}
              </span>
          </div>
          <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(event.id, event.clientName) }}
              className="text-white hover:text-red-300 font-bold px-1.5 ml-1 text-sm bg-black/10 rounded hover:bg-black/30 transition"
          >✕</button>
      </div>
    )
  }

  const slotPropGetter = (date: Date) => {
    const minutesOfDay = date.getHours() * 60 + date.getMinutes()
    const LUNCH_START = 12 * 60 + 15 
    const LUNCH_END = 13 * 60 + 30   
    if (minutesOfDay > LUNCH_START && minutesOfDay < LUNCH_END) {
      return { style: { backgroundColor: '#f3f4f6', backgroundImage: 'repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px', opacity: 0.5, pointerEvents: 'none' as 'none' } }
    }
    return {}
  }


  // Le composant Modale complet est inchangé.

  const DetailsModal = ({ booking, onClose }: { booking: BookingDetails, onClose: () => void }) => {
    if (!booking) return null;
    
    const userRole = booking.user?.role || 'CLIENT';
    
    const handleStatus = (status: 'EMBARQUED' | 'NO_SHOW' | 'CONFIRMED') => {
        handleStatusUpdate(booking.id, status, undefined);
    };

    const handlePaymentToggle = () => {
        handleStatusUpdate(booking.id, undefined, !booking.isPaid);
    };
    
    const handleCancellation = () => {
        handleDelete(booking.id, booking.clientName);
        onClose();
    };

    const handleTimeChangeClick = () => {
        onClose();
        handleEditTime(booking);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300">
                
                {/* Header Modale */}
                <div className="p-5 border-b flex justify-between items-center bg-blue-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-blue-900">Détails Réservation {format(booking.start, 'HH:mm')}</h3>
                    <button onClick={onClose} className="text-xl text-slate-500 hover:text-black">✕</button>
                </div>
                
                {/* Corps de la Modale */}
                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-3 gap-4 pt-4 text-center">
                        <div className="text-sm">
                            <p className="text-xl font-extrabold text-slate-800">{format(booking.start, 'EEEE d MMMM')}</p>
                            <p className="text-xs text-slate-500">Date</p>
                        </div>
                        <div className="text-sm">
                            <p className="text-xl font-extrabold text-blue-600">{format(booking.start, 'HH:mm')}</p>
                            <p className="text-xs text-slate-500">Heure Départ</p>
                        </div>
                        <div className="text-sm">
                            <p className="text-xl font-extrabold text-slate-800">{booking.peopleCount}</p>
                            <p className="text-xs text-slate-500">Passagers ({booking.language})</p>
                        </div>
                    </div>

                    {/* Infos Client */}
                    <div className="border p-3 rounded space-y-1">
                        <p className="font-bold text-lg text-slate-800">{booking.clientName}</p>
                        <p className="text-sm text-slate-600">📧 {booking.user.email}</p>
                        <p className="text-sm text-slate-600">📞 {booking.user.phone || 'N/A'}</p>
                        <p className="text-xs text-slate-400">Rôle Compte: {userRole}</p>
                    </div>

                    {/* Facture rapide */}
                    <div className="p-3 bg-yellow-50 rounded text-sm flex justify-between">
                        <span>💰 Total Réservation :</span>
                        <span className="font-bold text-lg text-red-700">{booking.totalPrice.toFixed(2)} €</span>
                    </div>

                    {/* Statuts Opérationnels */}
                    <div className="grid grid-cols-3 gap-4 pt-4 text-center">
                        <div className="flex flex-col items-center">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Paiement</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${booking.isPaid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {booking.isPaid ? 'RÉGLÉ' : 'NON PAYÉ'}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Check-in</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold 
                                ${booking.checkinStatus === 'EMBARQUED' ? 'bg-green-600 text-white' : 
                                  booking.checkinStatus === 'NO_SHOW' ? 'bg-gray-600 text-white' : 'bg-orange-100 text-orange-600'}`}>
                                {booking.checkinStatus}
                            </span>
                        </div>
                    </div>

                </div>

                {/* Footer / Actions */}
                <div className="p-5 flex flex-wrap justify-end gap-3 border-t">
                    
                    {/* ACTIONS SUR STATUT DE L'ARRIVÉE */}
                    {booking.checkinStatus === 'CONFIRMED' && (
                        <>
                            <button onClick={() => handleStatus('EMBARQUED')} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition shadow">
                                ✅ Embarqué
                            </button>
                            <button onClick={() => handleStatus('NO_SHOW')} className="bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700 transition shadow">
                                ❌ Non Show
                            </button>
                        </>
                    )}
                    {/* Revenir à CONFIRMED */}
                    {(booking.checkinStatus === 'EMBARQUED' || booking.checkinStatus === 'NO_SHOW') && (
                         <button onClick={() => handleStatus('CONFIRMED')} className="bg-slate-500 text-white px-4 py-2 rounded font-bold hover:bg-slate-600 transition shadow">
                            Revert (Confirmer)
                        </button>
                    )}
                    
                    {/* BOUTON TOGGLE PAIEMENT */}
                    <button onClick={handlePaymentToggle} className={`bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition shadow`}>
                        {booking.isPaid ? '❌ Marquer Non Payé' : '✅ Marquer Payé'}
                    </button>

                    {/* ANNULATION & MODIF */}
                    <button onClick={handleTimeChangeClick} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition shadow">
                        Modifier Heure
                    </button>
                    <button onClick={handleCancellation} className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition shadow">
                        Annuler Résa
                    </button>
                </div>
            </div>
        </div>
    );
  };


  return (
    <div className="h-screen p-6 bg-slate-50 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
            <div>
                <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-1 inline-block">
                  ← Tableau de Bord
                </Link>
                <h1 className="text-2xl font-bold text-blue-900">Planning de la Flotte 🛶</h1>
                <p className="text-sm text-slate-500">
                  {loadingBoats ? "Chargement des barques..." : "Cliquez sur un créneau libre pour ajouter une réservation."}
                </p>
            </div>
            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span> LIVE
            </div>
        </div>
        <div className="flex gap-3">
            <button onClick={() => fetchBookings(currentRange.start, currentRange.end)} className="px-4 py-2 bg-white border shadow-sm rounded hover:bg-slate-50 text-sm font-bold text-slate-600 transition">Actualiser 🔄</button>
            <button onClick={() => logout()} className="px-4 py-2 bg-red-50 border border-red-100 shadow-sm rounded hover:bg-red-100 text-sm font-bold text-red-600 transition flex items-center gap-2">Déconnexion 🚪</button>
        </div>
      </div>
      
      <div className="flex-1 bg-white border rounded-xl shadow-sm p-4">
        {/* Affichage du calendrier */}
        {!loadingBoats && resources.length === 0 ? (
            <div className="h-full flex items-center justify-center text-red-500 font-bold">
                ⚠️ Aucune barque trouvée. Veuillez lancer le script de seed (npx prisma db seed).
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
            onSelectEvent={handleSelectBooking} // Ouvre la modale au clic
            onSelectSlot={handleSlotSelect} // Ouvre la modale rapide au clic sur un créneau vide
            selectable={true}
            
            view={currentView} // FIX : Contrôle de l'état de la vue
            onView={handleViewChange} // FIX : Mise à jour de l'état de la vue
            
            defaultView={Views.WORK_WEEK} 
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
            
            components={{ event: EventComponent, resourceHeader: ResourceHeader }}
            eventPropGetter={(event: any) => {
                 let style = {};
                 
                 if (event.checkinStatus === 'EMBARQUED') {
                     style.backgroundColor = '#1f4068'; 
                     style.color = 'white';
                 } else if (event.checkinStatus === 'NO_SHOW') {
                     style.backgroundColor = '#e69900'; 
                     style.color = 'black';
                 } else {
                     style.backgroundColor = event.resourceId === 1 ? '#2563eb' : event.resourceId === 2 ? '#008b8b' : event.resourceId === 3 ? '#7c3aed' : '#d97706';
                     style.color = 'white';
                 }

                 return { style: {...style, borderRadius: '6px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'} };
             }}
            />
        )}
      </div>

      {/* Rendu de la modale */}
      {showDetailsModal && selectedBooking && (
          <DetailsModal 
              booking={selectedBooking} 
              onClose={() => setShowDetailsModal(false)} 
          />
      )}
      
      {/* Rendu de la modale de Réservation Rapide */}
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