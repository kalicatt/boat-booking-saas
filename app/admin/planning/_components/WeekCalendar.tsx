'use client'

import { useState } from 'react'
import { addDays, format, startOfWeek, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Booking {
  id: string
  startTime: Date
  endTime: Date
  customerName: string
  guests: number
  isPrivate?: boolean
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

// Drapeaux pour les langues
const LANGUAGE_FLAGS: Record<string, string> = {
  FR: '🇫🇷',
  EN: '🇬🇧',
  DE: '🇩🇪',
  ES: '🇪🇸',
  IT: '🇮🇹',
  NL: '🇳🇱',
  PT: '🇵🇹',
  RU: '🇷🇺',
  ZH: '🇨🇳',
  JA: '🇯🇵',
  KO: '🇰🇷',
  AR: '🇸🇦'
}

interface Boat {
  id: number
  name: string
  capacity: number
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
}

interface WeekCalendarProps {
  boats: Boat[]
  bookings: Booking[]
  onSlotClick: (date: Date, hour: number, boatId: number) => void
  onBookingClick: (booking: Booking) => void
}

export function WeekCalendar({ boats, bookings, onSlotClick, onBookingClick }: WeekCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Lundi
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  // Heures d'opération (8h-20h)
  const hours = Array.from({ length: 12 }, (_, i) => i + 8)
  
  const goToPreviousWeek = () => {
    setCurrentWeek(addDays(currentWeek, -7))
  }
  
  const goToNextWeek = () => {
    setCurrentWeek(addDays(currentWeek, 7))
  }
  
  const goToToday = () => {
    setCurrentWeek(new Date())
  }
  
  const getBookingsForSlot = (date: Date, hour: number, boatId: number) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.startTime)
      const bookingHour = bookingDate.getHours()
      return (
        isSameDay(bookingDate, date) &&
        bookingHour === hour &&
        booking.boatId === boatId.toString()
      )
    })
  }
  
  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-100 border-emerald-400 text-emerald-800'
      case 'PENDING':
        return 'bg-amber-100 border-amber-400 text-amber-800'
      case 'CANCELLED':
        return 'bg-slate-100 border-slate-300 text-slate-600'
      default:
        return 'bg-slate-100 border-slate-300 text-slate-600'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {format(weekStart, 'd MMMM', { locale: fr })} - {format(addDays(weekStart, 6), 'd MMMM yyyy', { locale: fr })}
          </h2>
          <p className="text-sm text-slate-600 mt-1">Planning hebdomadaire</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Aujourd&apos;hui
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
              aria-label="Semaine précédente"
            >
              ←
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
              aria-label="Semaine suivante"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Calendrier */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header jours */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
            <div className="p-3 border-r border-slate-200">
              <span className="text-xs font-semibold text-slate-600 uppercase">Bateau / Jour</span>
            </div>
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date())
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 text-center border-r border-slate-200 ${
                    isToday ? 'bg-sky-50' : ''
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase ${
                    isToday ? 'text-sky-600' : 'text-slate-600'
                  }`}>
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${
                    isToday ? 'text-sky-600' : 'text-slate-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grille par bateau */}
          {boats.filter(boat => boat.status === 'ACTIVE').map((boat) => (
            <div key={boat.id} className="border-b border-slate-200">
              {/* Header bateau */}
              <div className="grid grid-cols-[100px_repeat(7,1fr)]">
                <div className="p-3 bg-slate-50 border-r border-slate-200 sticky left-0">
                  <div className="text-sm font-semibold text-slate-900">{boat.name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {boat.capacity} pers.
                  </div>
                </div>
                
                {/* Colonnes par jour */}
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, new Date())
                  return (
                    <div
                      key={`${boat.id}-${day.toISOString()}`}
                      className={`border-r border-slate-200 ${isToday ? 'bg-sky-50/30' : ''}`}
                    >
                      {/* Slots horaires */}
                      <div className="divide-y divide-slate-100">
                        {hours.map((hour) => {
                          const slotBookings = getBookingsForSlot(day, hour, boat.id)
                          const isEmpty = slotBookings.length === 0
                          
                          return (
                            <div
                              key={hour}
                              onClick={() => isEmpty && onSlotClick(day, hour, boat.id)}
                              className={`min-h-[60px] p-1 ${
                                isEmpty 
                                  ? 'hover:bg-sky-100 cursor-pointer transition'
                                  : ''
                              }`}
                            >
                              {isEmpty ? (
                                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                                  {hour}:00
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {slotBookings.map((booking) => (
                                    <button
                                      key={booking.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onBookingClick(booking)
                                      }}
                                      className={`w-full p-2 rounded border text-left text-xs transition hover:shadow-md ${
                                        booking.isPrivate
                                          ? 'bg-violet-50 border-violet-300 text-violet-900 hover:bg-violet-100'
                                          : getStatusColor(booking.status)
                                      }`}
                                    >
                                      <div className="font-semibold truncate flex items-center gap-1">
                                        {booking.language && (
                                          <span title={booking.language}>
                                            {LANGUAGE_FLAGS[booking.language.toUpperCase()] || booking.language}
                                          </span>
                                        )}
                                        {booking.isPrivate && (
                                          <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800" title="Privatisation">
                                            Privé
                                          </span>
                                        )}
                                        <span>{format(new Date(booking.startTime), 'HH:mm')}</span>
                                        <span className="truncate">- {booking.customerName}</span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span>👥 {booking.guests}</span>
                                        {booking.status === 'CONFIRMED' && <span className="ml-auto">✓</span>}
                                        {booking.status === 'PENDING' && <span className="ml-auto">⏳</span>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-6 p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-violet-100 border border-violet-400"></div>
          <span className="text-sm text-slate-700">Privatisation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-400"></div>
          <span className="text-sm text-slate-700">Confirmé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-100 border border-amber-400"></div>
          <span className="text-sm text-slate-700">En attente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-100 border border-slate-300"></div>
          <span className="text-sm text-slate-700">Annulé</span>
        </div>
        <div className="ml-auto text-sm text-slate-600">
          Click sur une case vide pour créer une réservation
        </div>
      </div>
    </div>
  )
}
