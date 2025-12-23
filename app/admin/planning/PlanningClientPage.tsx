'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DayView } from './_components/DayView'
import { WeekCalendar } from './_components/WeekCalendar'
import QuickBookingModal from '@/components/QuickBookingModal'
import { QuickEditModal } from './_components/QuickEditModal'
import { addDays, format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Boat {
  id: number
  name: string
  capacity: number
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
}

interface Booking {
  id: string
  startTime: Date
  endTime: Date
  customerName: string
  guests: number
  adults: number
  children: number
  babies: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EMBARQUED' | 'NO_SHOW'
  boatId: string | null
  publicReference?: string | null
  email?: string | null
  phone?: string | null
  language?: string | null
}

interface TimeSlot {
  hour: number
  minute: number
  displayTime: string
}

interface PlanningClientPageProps {
  boats: Boat[]
  bookings: Booking[]
}

type ViewMode = 'day' | 'week'

export function PlanningClientPage({ boats, bookings }: PlanningClientPageProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date
    hour: number
    minute: number
    boatId: number
    boatName: string
  } | null>(null)
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CONFIRMED' | 'PENDING'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isLive, setIsLive] = useState(false)

  // Connexion SSE pour les mises à jour en temps réel
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      eventSource = new EventSource('/api/admin/planning/stream')
      
      eventSource.addEventListener('connected', () => {
        setIsLive(true)
        console.log('🟢 Planning live connecté')
      })

      eventSource.addEventListener('update', (event) => {
        console.log('📡 Mise à jour reçue:', event.data)
        // Ne pas rafraîchir si un modal est ouvert
        if (!showQuickForm && !selectedBooking) {
          router.refresh()
          setLastRefresh(new Date())
        }
      })

      eventSource.onerror = () => {
        setIsLive(false)
        eventSource?.close()
        // Reconnecter après 3 secondes
        reconnectTimeout = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      eventSource?.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [router, showQuickForm, selectedBooking])

  // Rafraîchissement manuel
  const handleManualRefresh = useCallback(() => {
    router.refresh()
    setLastRefresh(new Date())
  }, [router])

  const handleDaySlotClick = (date: Date, timeSlot: TimeSlot, boatId: number) => {
    console.log('📅 handleDaySlotClick called:', { date, timeSlot, boatId })
    const boat = boats.find(b => b.id === boatId)
    console.log('🚤 Boat found:', boat)
    if (boat) {
      setSelectedSlot({ 
        date, 
        hour: timeSlot.hour, 
        minute: timeSlot.minute, 
        boatId, 
        boatName: boat.name 
      })
      console.log('✅ Setting showQuickForm to true')
      setShowQuickForm(true)
    } else {
      console.error('❌ No boat found for id:', boatId)
    }
  }

  const handleWeekSlotClick = (date: Date, hour: number, boatId: number) => {
    const boat = boats.find(b => b.id === boatId)
    if (boat) {
      setSelectedSlot({ 
        date, 
        hour, 
        minute: 0, 
        boatId, 
        boatName: boat.name 
      })
      setShowQuickForm(true)
    }
  }

  const handleBookingClick = (booking: Booking) => {
    console.log('📖 Booking clicked, opening edit modal:', booking)
    setSelectedBooking(booking)
  }

  const handleBookingUpdate = async (id: string, updates: Partial<Booking>) => {
    try {
      // Transformer les updates pour correspondre à l'API
      const payload: Record<string, any> = {}
      if (updates.status !== undefined) {
        // Tous les statuts vont dans newCheckinStatus
        payload.newCheckinStatus = updates.status
      }
      if (updates.startTime !== undefined) {
        payload.start = updates.startTime
      }
      if (updates.adults !== undefined) payload.adults = updates.adults
      if (updates.children !== undefined) payload.children = updates.children
      if (updates.babies !== undefined) payload.babies = updates.babies
      
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to update booking')
      }
      // Actualisation instantanée du planning
      router.refresh()
    } catch (error) {
      console.error('Error updating booking:', error)
      throw error
    }
  }

  const handleBookingDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete booking')
      // Actualisation instantanée du planning
      router.refresh()
    } catch (error) {
      console.error('Error deleting booking:', error)
      throw error
    }
  }

  const handleQuickBookingSubmit = async (formData: any) => {
    // TODO: Appeler API pour créer la réservation
    console.log('Creating booking:', formData, selectedSlot)
    
    // Simuler appel API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setShowQuickForm(false)
    setSelectedSlot(null)
    
    // TODO: Recharger les données
  }

  const goToPreviousDay = () => {
    setCurrentDate(addDays(currentDate, -1))
  }

  const goToNextDay = () => {
    setCurrentDate(addDays(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Filtrer les réservations
  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = filterStatus === 'ALL' || booking.status === filterStatus
    const matchesSearch = searchQuery === '' || 
      booking.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    
    // En mode jour, filtrer aussi par date
    const matchesDate = viewMode === 'week' || isSameDay(new Date(booking.startTime), currentDate)
    
    return matchesStatus && matchesSearch && matchesDate
  })

  return (
    <div className="space-y-6">
      {/* Header avec navigation et sélecteur de vue */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Navigation date */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Aujourd'hui
            </button>
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg">
              <button
                onClick={viewMode === 'day' ? goToPreviousDay : () => setCurrentDate(addDays(currentDate, -7))}
                className="p-2 hover:bg-slate-100 rounded-l-lg transition"
                aria-label="Précédent"
              >
                ←
              </button>
              <div className="px-4 py-2 min-w-[200px] text-center border-x border-slate-200">
                <span className="text-sm font-semibold text-slate-900">
                  {viewMode === 'day' 
                    ? format(currentDate, 'd MMMM yyyy', { locale: fr })
                    : `Semaine du ${format(currentDate, 'd MMM', { locale: fr })}`
                  }
                </span>
              </div>
              <button
                onClick={viewMode === 'day' ? goToNextDay : () => setCurrentDate(addDays(currentDate, 7))}
                className="p-2 hover:bg-slate-100 rounded-r-lg transition"
                aria-label="Suivant"
              >
                →
              </button>
            </div>
          </div>

          {/* Sélecteur de vue */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                viewMode === 'day'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                viewMode === 'week'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Semaine
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 lg:ml-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            />
          </div>

          {/* Filtres statut */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                filterStatus === 'ALL'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setFilterStatus('CONFIRMED')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                filterStatus === 'CONFIRMED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Confirmé
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                filterStatus === 'PENDING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              En attente
            </button>
          </div>

          {/* Indicateur Live + Bouton rafraîchir */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isLive 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isLive ? 'Live' : 'Reconnexion...'}
            </div>
            <button
              onClick={handleManualRefresh}
              className="p-2 text-slate-600 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition"
              title={`Dernière mise à jour : ${format(lastRefresh, 'HH:mm:ss')}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">{filteredBookings.length}</div>
          <div className="text-sm text-slate-600 mt-1">Réservations</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-emerald-600">
            {filteredBookings.filter(b => b.status === 'CONFIRMED').length}
          </div>
          <div className="text-sm text-slate-600 mt-1">Confirmées</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-amber-600">
            {filteredBookings.filter(b => b.status === 'PENDING').length}
          </div>
          <div className="text-sm text-slate-600 mt-1">En attente</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-sky-600">
            {boats.filter(b => b.status === 'ACTIVE').length}
          </div>
          <div className="text-sm text-slate-600 mt-1">Bateaux actifs</div>
        </div>
      </div>

      {/* Vue selon mode sélectionné */}
      {viewMode === 'day' ? (
        <DayView
          date={currentDate}
          boats={boats}
          bookings={filteredBookings}
          startHour={8}
          endHour={20}
          onSlotClick={handleDaySlotClick}
          onBookingClick={handleBookingClick}
        />
      ) : (
        <WeekCalendar
          boats={boats}
          bookings={filteredBookings}
          onSlotClick={handleWeekSlotClick}
          onBookingClick={handleBookingClick}
        />
      )}

      {/* Modal de réservation rapide */}
      {showQuickForm && selectedSlot && (
        <QuickBookingModal
            slotStart={new Date(
              selectedSlot.date.getFullYear(),
              selectedSlot.date.getMonth(),
              selectedSlot.date.getDate(),
              selectedSlot.hour,
              selectedSlot.minute
            )}
            boatId={selectedSlot.boatId}
            resources={boats.map(b => ({ 
              id: b.id, 
              title: b.name, 
              capacity: b.capacity 
            }))}
            onSuccess={() => {
              setShowQuickForm(false)
              setSelectedSlot(null)
              // Actualisation instantanée du planning
              router.refresh()
            }}
            onClose={() => {
              setShowQuickForm(false)
              setSelectedSlot(null)
            }}
            canOverrideLockedDays={true}
          />
      )}

      {/* Modal d'édition de réservation */}
      {selectedBooking && (
        <QuickEditModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={handleBookingUpdate}
          onDelete={handleBookingDelete}
        />
      )}
    </div>
  )
}
