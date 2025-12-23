'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createPortal } from 'react-dom'

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

interface TimeSlot {
  hour: number
  minute: number
  displayTime: string
}

interface BlockedSlot {
  id: string
  start: string
  end: string
  scope: string
  reason?: string | null
}

interface DayViewProps {
  date: Date
  boats: Boat[]
  bookings: Booking[]
  startHour?: number
  endHour?: number
  onSlotClick: (date: Date, timeSlot: TimeSlot, boatId: number) => void
  onBookingClick: (booking: Booking) => void
}

// Modal de confirmation pour déplacer une réservation
function MoveBookingModal({
  booking,
  newTime,
  onConfirm,
  onCancel,
  isLoading
}: {
  booking: Booking
  newTime: string
  onConfirm: (sendEmail: boolean) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [sendEmail, setSendEmail] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Déplacer la réservation</h3>
          <p className="text-sm text-slate-600 mt-0.5">
            Confirmation de déplacement
          </p>
        </div>

        {/* Body */}
        <div className="p-6 bg-slate-50">
          <p className="text-sm text-slate-700 mb-4">
            Voulez-vous déplacer la réservation de <strong className="text-slate-900">{booking.customerName}</strong> vers <strong className="text-slate-900">{newTime}</strong> ?
          </p>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm text-slate-700">
              Envoyer un email de notification au client
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-semibold transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(sendEmail)}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Déplacement...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// Modal de confirmation pour bloquer/débloquer un horaire
function BlockSlotModal({
  slot,
  date,
  isBlocked,
  blockInfo,
  onConfirm,
  onCancel,
  isLoading
}: {
  slot: TimeSlot
  date: Date
  isBlocked: boolean
  blockInfo?: BlockedSlot | null
  onConfirm: (reason?: string) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [reason, setReason] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const formattedDate = format(date, 'd MMMM yyyy', { locale: fr })

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {isBlocked ? 'Débloquer cet horaire' : 'Bloquer cet horaire'}
          </h3>
          <p className="text-sm text-slate-600 mt-0.5">
            {isBlocked 
              ? `Retirer le blocage sur ${slot.displayTime}`
              : `Bloquer ${slot.displayTime}`
            } • {formattedDate}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 bg-slate-50 space-y-4">
          {isBlocked && blockInfo?.reason && (
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Raison actuelle</span>
              <p className="text-sm text-slate-700 mt-1">{blockInfo.reason}</p>
            </div>
          )}

          {!isBlocked && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Raison (optionnel)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Maintenance, météo..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>
          )}

          <p className="text-xs text-slate-600">
            {isBlocked 
              ? '✓ Ce créneau redeviendra disponible à la réservation.'
              : '⚠ Ce créneau sera indisponible à la vente sur le site.'}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-semibold transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason || undefined)}
            disabled={isLoading}
            className={`px-4 py-2 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
              isBlocked 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isLoading 
              ? (isBlocked ? 'Déblocage...' : 'Blocage...') 
              : (isBlocked ? 'Débloquer' : 'Bloquer')
            }
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export function DayView({ 
  date, 
  boats, 
  bookings, 
  onSlotClick, 
  onBookingClick 
}: DayViewProps) {
  const dateKey = format(date, 'yyyy-MM-dd')
  const storageKey = `boat-names-${dateKey}`
  
  const [editingBoat, setEditingBoat] = useState<{ timeSlot: string } | null>(null)
  const [boatNames, setBoatNames] = useState<Record<string, Record<string, string>>>({})
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Charger les noms de bateaux depuis localStorage après hydratation
  useEffect(() => {
    setIsHydrated(true)
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        setBoatNames(JSON.parse(stored))
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
  }, [storageKey])

  // Drag & Drop state
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null)
  const [dropTarget, setDropTarget] = useState<TimeSlot | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [pendingMove, setPendingMove] = useState<{ booking: Booking; newSlot: TimeSlot } | null>(null)
  const [isMoveLoading, setIsMoveLoading] = useState(false)

  // Block slot state
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [pendingBlock, setPendingBlock] = useState<{ slot: TimeSlot; isBlocked: boolean; blockInfo?: BlockedSlot } | null>(null)
  const [isBlockLoading, setIsBlockLoading] = useState(false)
  
  // Charger les blocages
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const res = await fetch('/api/admin/blocks')
        if (res.ok) {
          const data = await res.json()
          setBlockedSlots(data)
        }
      } catch (e) {
        console.error('Error fetching blocks:', e)
      }
    }
    fetchBlocks()
  }, [date])

  // Sauvegarder dans localStorage à chaque changement (seulement après hydratation)
  useEffect(() => {
    if (isHydrated && Object.keys(boatNames).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(boatNames))
    }
  }, [boatNames, storageKey, isHydrated])

  // Générer tous les créneaux de 5 minutes pour la visualisation (9h-19h)
  const generateAllTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []
    for (let hour = 9; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        if (hour === 19 && minute > 0) break
        slots.push({
          hour,
          minute,
          displayTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        })
      }
    }
    return slots
  }

  const timeSlots = generateAllTimeSlots()
  const activeBoats = boats.filter(boat => boat.status === 'ACTIVE')

  // Vérifier si un slot est bloqué
  const isSlotBlocked = useCallback((timeSlot: TimeSlot): { blocked: boolean; blockInfo?: BlockedSlot } => {
    // Construire la date du slot en UTC "flottant" (même format que les blocages)
    const dateStr = format(date, 'yyyy-MM-dd')
    const hh = String(timeSlot.hour).padStart(2, '0')
    const mm = String(timeSlot.minute).padStart(2, '0')
    const slotTime = new Date(`${dateStr}T${hh}:${mm}:00.000Z`).getTime()
    
    for (const block of blockedSlots) {
      const blockStart = new Date(block.start).getTime()
      const blockEnd = new Date(block.end).getTime()
      
      // Vérifier si le slot est dans la période du blocage
      if (slotTime >= blockStart && slotTime < blockEnd) {
        return { blocked: true, blockInfo: block }
      }
    }
    return { blocked: false }
  }, [blockedSlots, date])

  // Memoïser le mapping des bookings par slot pour éviter re-calculs
  const bookingsBySlot = useMemo(() => {
    const map = new Map<string, Booking[]>()
    bookings.forEach(booking => {
      const bookingStart = new Date(booking.startTime)
      const slotKey = `${bookingStart.getHours()}:${bookingStart.getMinutes()}`
      const existing = map.get(slotKey) || []
      map.set(slotKey, [...existing, booking])
    })
    return map
  }, [bookings])

  const getBookingsForSlot = (timeSlot: TimeSlot): Booking[] => {
    const slotKey = `${timeSlot.hour}:${timeSlot.minute}`
    return bookingsBySlot.get(slotKey) || []
  }

  const getAssignedBoat = (timeSlot: TimeSlot): Boat | null => {
    const totalMinutes = timeSlot.hour * 60 + timeSlot.minute
    const isMorningSlot = totalMinutes >= 10 * 60 && totalMinutes <= 11 * 60 + 45
    const isAfternoonSlot = totalMinutes >= 13 * 60 + 30 && totalMinutes <= 18 * 60
    
    if (!isMorningSlot && !isAfternoonSlot) return null
    
    const offsets = [0, 5, 20, 25]
    const minutesFromHourStart = timeSlot.minute % 30
    const offsetIndex = offsets.indexOf(minutesFromHourStart)
    
    if (offsetIndex === -1) return null
    if (offsetIndex >= activeBoats.length) return activeBoats[0] || null
    return activeBoats[offsetIndex]
  }

  const getBoatOffsetKey = (timeSlot: TimeSlot): string => {
    const offsets = [0, 5, 20, 25]
    const minutesFromHourStart = timeSlot.minute % 30
    const offsetIndex = offsets.indexOf(minutesFromHourStart)
    return `offset-${offsetIndex >= 0 ? offsetIndex : 0}`
  }

  const isLunchBreak = (timeSlot: TimeSlot): boolean => {
    const totalMinutes = timeSlot.hour * 60 + timeSlot.minute
    return totalMinutes >= 12 * 60 && totalMinutes < 13 * 60 + 30
  }

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
      case 'EMBARQUED':
        return 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100'
      case 'NO_SHOW':
        return 'bg-purple-100 border-purple-400 text-purple-900 hover:bg-purple-200'
      case 'PENDING':
        return 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
      case 'CANCELLED':
        return 'bg-rose-50 border-rose-300 text-rose-900 hover:bg-rose-100'
      default:
        return 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
    }
  }

  const getBoatName = (timeSlot: TimeSlot, boat: Boat | null): string => {
    if (!boat) return '-'
    const offsetKey = getBoatOffsetKey(timeSlot)
    const timeSlotIndex = timeSlots.findIndex(s => s.displayTime === timeSlot.displayTime)
    
    for (let i = timeSlotIndex; i >= 0; i--) {
      const slot = timeSlots[i]
      const slotOffsetKey = getBoatOffsetKey(slot)
      if (slotOffsetKey === offsetKey && boatNames[slot.displayTime]?.[offsetKey]) {
        return boatNames[slot.displayTime][offsetKey]
      }
    }
    return boat.name
  }

  const handleBoatNameChange = (timeSlot: TimeSlot, newName: string) => {
    const offsetKey = getBoatOffsetKey(timeSlot)
    const timeSlotIndex = timeSlots.findIndex(s => s.displayTime === timeSlot.displayTime)
    
    setBoatNames(prev => {
      const updated = { ...prev }
      for (let i = timeSlotIndex; i < timeSlots.length; i++) {
        const slot = timeSlots[i]
        const slotOffsetKey = getBoatOffsetKey(slot)
        if (slotOffsetKey === offsetKey) {
          if (!updated[slot.displayTime]) {
            updated[slot.displayTime] = {}
          }
          updated[slot.displayTime][offsetKey] = newName
        }
      }
      return updated
    })
  }

  // Auto-scroll during drag
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const startAutoScroll = useCallback((clientY: number) => {
    const scrollThreshold = 100 // pixels from edge to start scrolling
    const scrollSpeed = 15 // pixels per interval
    
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
    }
    
    scrollIntervalRef.current = setInterval(() => {
      const windowHeight = window.innerHeight
      
      if (clientY < scrollThreshold) {
        // Scroll up
        window.scrollBy(0, -scrollSpeed)
      } else if (clientY > windowHeight - scrollThreshold) {
        // Scroll down
        window.scrollBy(0, scrollSpeed)
      }
    }, 16) // ~60fps
  }, [])
  
  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
      }
    }
  }, [])

  // Enable wheel scroll during drag
  useEffect(() => {
    if (!draggedBooking) return
    
    const handleWheel = (e: WheelEvent) => {
      // Allow wheel scrolling during drag
      window.scrollBy(0, e.deltaY)
    }
    
    // Add listener with passive: false to ensure we can scroll
    document.addEventListener('wheel', handleWheel, { passive: true })
    
    return () => {
      document.removeEventListener('wheel', handleWheel)
    }
  }, [draggedBooking])

  // Touch drag state for tablets
  const touchDragRef = useRef<{
    booking: Booking
    startY: number
    currentY: number
    element: HTMLElement | null
  } | null>(null)
  const [touchDragBooking, setTouchDragBooking] = useState<Booking | null>(null)
  const [touchDropTarget, setTouchDropTarget] = useState<TimeSlot | null>(null)

  // Touch drag handlers for tablet support
  const handleTouchDragStart = useCallback((e: React.TouchEvent, booking: Booking) => {
    const touch = e.touches[0]
    const target = e.currentTarget as HTMLElement
    
    touchDragRef.current = {
      booking,
      startY: touch.clientY,
      currentY: touch.clientY,
      element: target
    }
    
    // Long press to initiate drag
    const longPressTimer = setTimeout(() => {
      if (touchDragRef.current) {
        setTouchDragBooking(booking)
        setDraggedBooking(booking)
        // Add visual feedback
        target.style.opacity = '0.5'
        target.style.transform = 'scale(1.05)'
      }
    }, 300) // 300ms long press
    
    // Store timer to cancel if touch ends early
    ;(touchDragRef.current as typeof touchDragRef.current & { timer?: NodeJS.Timeout }).timer = longPressTimer
  }, [])

  const handleTouchDragMove = useCallback((e: React.TouchEvent) => {
    if (!touchDragRef.current || !touchDragBooking) return
    
    const touch = e.touches[0]
    touchDragRef.current.currentY = touch.clientY
    
    // Find the time slot under the touch point
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY)
    for (const el of elements) {
      const slotData = (el as HTMLElement).dataset?.timeslot
      if (slotData) {
        try {
          const slot = JSON.parse(slotData) as TimeSlot
          setTouchDropTarget(slot)
          setDropTarget(slot)
        } catch {
          // ignore parse errors
        }
        break
      }
    }
    
    // Auto-scroll while dragging
    startAutoScroll(touch.clientY)
    
    e.preventDefault() // Prevent scrolling while dragging
  }, [touchDragBooking, startAutoScroll])

  const handleTouchDragEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (touchDragRef.current && (touchDragRef.current as typeof touchDragRef.current & { timer?: NodeJS.Timeout }).timer) {
      clearTimeout((touchDragRef.current as typeof touchDragRef.current & { timer?: NodeJS.Timeout }).timer)
    }
    
    // Reset visual feedback
    if (touchDragRef.current?.element) {
      touchDragRef.current.element.style.opacity = ''
      touchDragRef.current.element.style.transform = ''
    }
    
    // If we have a valid drop target and dragged booking, show move modal
    if (touchDragBooking && touchDropTarget) {
      setPendingMove({ booking: touchDragBooking, newSlot: touchDropTarget })
      setShowMoveModal(true)
    }
    
    // Clean up
    stopAutoScroll()
    setTouchDragBooking(null)
    setTouchDropTarget(null)
    setDraggedBooking(null)
    setDropTarget(null)
    touchDragRef.current = null
  }, [touchDragBooking, touchDropTarget, stopAutoScroll])

  // Drag handlers (mouse/desktop)
  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    setDraggedBooking(booking)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', booking.id)
  }

  const handleDragEnd = () => {
    setDraggedBooking(null)
    setDropTarget(null)
    stopAutoScroll()
  }

  const handleDragOver = (e: React.DragEvent, timeSlot: TimeSlot) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(timeSlot)
    // Enable auto-scroll while dragging
    if (draggedBooking) {
      startAutoScroll(e.clientY)
    }
  }

  const handleDragLeave = () => {
    setDropTarget(null)
    // Don't stop auto-scroll here - let it continue while dragging
  }

  const handleDrop = (e: React.DragEvent, timeSlot: TimeSlot) => {
    e.preventDefault()
    stopAutoScroll()
    if (draggedBooking) {
      setPendingMove({ booking: draggedBooking, newSlot: timeSlot })
      setShowMoveModal(true)
    }
    setDraggedBooking(null)
    setDropTarget(null)
  }

  // Confirm move
  const handleConfirmMove = async (sendEmail: boolean) => {
    if (!pendingMove) return
    
    setIsMoveLoading(true)
    try {
      const newStart = new Date(date)
      newStart.setHours(pendingMove.newSlot.hour, pendingMove.newSlot.minute, 0, 0)
      
      const response = await fetch(`/api/bookings/${pendingMove.booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: newStart.toISOString(),
          sendNotification: sendEmail
        })
      })

      if (!response.ok) {
        throw new Error('Échec du déplacement')
      }

      // Refresh the page to reload bookings
      window.location.reload()
    } catch (error) {
      console.error('Error moving booking:', error)
      alert('Erreur lors du déplacement de la réservation')
    } finally {
      setIsMoveLoading(false)
      setShowMoveModal(false)
      setPendingMove(null)
    }
  }

  // Handle slot click for blocking
  const handleTimeSlotClick = (timeSlot: TimeSlot) => {
    const { blocked, blockInfo } = isSlotBlocked(timeSlot)
    setPendingBlock({ slot: timeSlot, isBlocked: blocked, blockInfo })
    setShowBlockModal(true)
  }

  // Confirm block/unblock
  const handleConfirmBlock = async (reason?: string) => {
    if (!pendingBlock) return
    
    setIsBlockLoading(true)
    try {
      if (pendingBlock.isBlocked && pendingBlock.blockInfo) {
        // Débloquer - utilise query param
        const response = await fetch(`/api/admin/blocks?id=${pendingBlock.blockInfo.id}`, {
          method: 'DELETE'
        })
        if (!response.ok) throw new Error('Échec du déblocage')
      } else {
        // Bloquer - créer un nouveau blocage
        // Utiliser le format UTC "flottant" comme l'API availability
        const hh = String(pendingBlock.slot.hour).padStart(2, '0')
        const mm = String(pendingBlock.slot.minute).padStart(2, '0')
        const dateStr = format(date, 'yyyy-MM-dd')
        
        const startStr = `${dateStr}T${hh}:${mm}:00.000Z`
        const endMinute = pendingBlock.slot.minute + 5
        const endHour = pendingBlock.slot.hour + Math.floor(endMinute / 60)
        const endMm = String(endMinute % 60).padStart(2, '0')
        const endHh = String(endHour).padStart(2, '0')
        const endStr = `${dateStr}T${endHh}:${endMm}:00.000Z`

        const response = await fetch('/api/admin/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start: startStr,
            end: endStr,
            scope: 'specific',
            reason: reason || 'Bloqué depuis le planning'
          })
        })
        if (!response.ok) throw new Error('Échec du blocage')
      }

      // Refresh blocks
      const res = await fetch('/api/admin/blocks')
      if (res.ok) {
        const data = await res.json()
        setBlockedSlots(data)
      }
    } catch (error) {
      console.error('Error toggling block:', error)
      alert('Erreur lors du blocage/déblocage')
    } finally {
      setIsBlockLoading(false)
      setShowBlockModal(false)
      setPendingBlock(null)
    }
  }

  const isToday = isSameDay(date, new Date())

  // Pinch-to-zoom state
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTouchDistance = useRef<number | null>(null)

  // Handle pinch-to-zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastTouchDistance.current = Math.hypot(dx, dy)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const distance = Math.hypot(dx, dy)
        const delta = distance / lastTouchDistance.current
        
        setScale(prev => {
          const newScale = prev * delta
          return Math.min(Math.max(newScale, 0.5), 2) // Limit between 0.5x and 2x
        })
        
        lastTouchDistance.current = distance
        e.preventDefault() // Prevent default zoom behavior
      }
    }

    const handleTouchEnd = () => {
      lastTouchDistance.current = null
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden w-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className={`text-lg font-semibold ${isToday ? 'text-sky-600' : 'text-slate-900'}`}>
              {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Cliquez sur l'heure pour bloquer • Glissez une réservation pour la déplacer
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded"
                title="Zoom arrière"
              >
                −
              </button>
              <span className="text-xs text-slate-600 min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(s => Math.min(2, s + 0.1))}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded"
                title="Zoom avant"
              >
                +
              </button>
              <button
                onClick={() => setScale(1)}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded text-xs"
                title="Réinitialiser le zoom"
              >
                1:1
              </button>
            </div>
            {isToday && (
              <span className="px-3 py-1 bg-sky-100 text-sky-800 text-sm font-semibold rounded-full">
                Aujourd'hui
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grille planning avec scroll horizontal et vertical */}
      <div 
        ref={containerRef}
        className="overflow-auto max-h-[80vh]"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', minWidth: 'max-content' }}>
          <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr>
                <th className="w-20 p-3 border-b border-r border-slate-200 text-left bg-slate-100">
                  <span className="text-xs font-semibold text-slate-600 uppercase">Heure</span>
                </th>
                <th className="w-40 p-3 border-b border-r border-slate-200 text-left bg-slate-100">
                  <span className="text-xs font-semibold text-slate-600 uppercase">Bateau</span>
                </th>
              <th className="p-3 border-b border-slate-200 text-left bg-slate-100">
                <span className="text-xs font-semibold text-slate-600 uppercase">Réservations</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot) => {
              const slotBookings = getBookingsForSlot(timeSlot)
              const assignedBoat = getAssignedBoat(timeSlot)
              const isEditing = editingBoat?.timeSlot === timeSlot.displayTime
              const isHourOrHalfHour = timeSlot.minute === 0 || timeSlot.minute === 30
              const isLunch = isLunchBreak(timeSlot)
              const totalPassengers = slotBookings.reduce((sum, b) => sum + (b.adults || 0) + (b.children || 0) + (b.babies || 0), 0)
              const isDropZone = dropTarget?.displayTime === timeSlot.displayTime
              const { blocked: isBlocked, blockInfo } = isSlotBlocked(timeSlot)
              
              return (
                <tr 
                  key={timeSlot.displayTime}
                  className={`${isHourOrHalfHour ? 'border-t-2 border-slate-300' : 'border-t border-slate-100'} ${
                    isLunch ? 'bg-amber-50/30' : ''
                  } ${isBlocked && !isLunch ? 'bg-rose-50' : ''}`}
                >
                  {/* Colonne heure - cliquable pour bloquer */}
                  <td 
                    className={`p-2 border-r border-slate-200 text-center cursor-pointer transition ${
                      timeSlot.minute === 0 ? 'bg-slate-50 hover:bg-slate-100' : 
                      isLunch ? 'bg-amber-50 hover:bg-amber-100' : 
                      isBlocked ? 'bg-rose-100 hover:bg-rose-200' :
                      'bg-white hover:bg-slate-50'
                    }`}
                    onClick={() => !isLunch && handleTimeSlotClick(timeSlot)}
                    title={isBlocked ? 'Cliquez pour débloquer' : 'Cliquez pour bloquer cet horaire'}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isBlocked && !isLunch && (
                        <span className="text-rose-500 text-xs">⊘</span>
                      )}
                      <span className={`text-xs ${
                        timeSlot.minute === 0 ? 'font-semibold text-slate-900' : 
                        isLunch ? 'text-amber-600' : 
                        isBlocked ? 'text-rose-600 font-medium' :
                        'text-slate-500'
                      }`}>
                        {timeSlot.displayTime}
                      </span>
                    </div>
                  </td>

                  {/* Colonne bateau */}
                  <td className={`p-2 border-r border-slate-200 ${isLunch ? 'bg-amber-50/50' : isBlocked ? 'bg-rose-50' : 'bg-slate-50'}`}>
                    {isLunch ? (
                      <div className="text-center py-1">
                        <span className="text-xs font-medium text-amber-600 italic">Pause</span>
                      </div>
                    ) : !assignedBoat ? (
                      <div className="text-center py-1">
                        <span className="text-xs text-slate-300">-</span>
                      </div>
                    ) : isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={getBoatName(timeSlot, assignedBoat)}
                          onChange={(e) => handleBoatNameChange(timeSlot, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              setEditingBoat(null)
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm border border-slate-400 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                        <button
                          onClick={() => setEditingBoat(null)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Valider"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingBoat({ timeSlot: timeSlot.displayTime })}
                        className="w-full text-left px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100 rounded transition"
                      >
                        {getBoatName(timeSlot, assignedBoat)}
                      </button>
                    )}
                    {!isLunch && assignedBoat && (
                      <div className="text-xs text-slate-500 mt-1 px-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Capacité</span>
                          <span className="font-semibold">
                            {totalPassengers}/{assignedBoat.capacity}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Colonne réservations - zone de drop */}
                  <td 
                    className={`p-2 border-slate-200 transition ${
                      isLunch ? 'bg-amber-50/30' : 
                      isBlocked ? 'bg-rose-50' :
                      isDropZone ? 'bg-sky-100 ring-2 ring-sky-400 ring-inset' : ''
                    }`}
                    data-timeslot={JSON.stringify(timeSlot)}
                    onDragOver={(e) => !isLunch && handleDragOver(e, timeSlot)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => !isLunch && handleDrop(e, timeSlot)}
                  >
                    {isLunch ? (
                      <div className="text-center py-2">
                        <span className="text-xs text-amber-600 italic">Fermé</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap min-h-[40px]">
                        {/* Indicateur de blocage */}
                        {isBlocked && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-rose-100 border border-rose-300 rounded text-xs text-rose-700 font-medium">
                            <span>⊘</span>
                            <span>Bloqué{blockInfo?.reason ? ` - ${blockInfo.reason}` : ''}</span>
                          </div>
                        )}
                        {/* Réservations existantes */}
                        {slotBookings.length > 0 && (
                          slotBookings.map((booking) => (
                            <div
                              key={booking.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, booking)}
                              onDragEnd={handleDragEnd}
                              onTouchStart={(e) => handleTouchDragStart(e, booking)}
                              onTouchMove={handleTouchDragMove}
                              onTouchEnd={handleTouchDragEnd}
                              onClick={() => onBookingClick(booking)}
                              className={`inline-flex flex-col p-2 rounded border-l-4 text-left transition cursor-grab active:cursor-grabbing hover:shadow-md touch-none ${
                                getStatusColor(booking.status)
                              } ${draggedBooking?.id === booking.id ? 'opacity-50' : ''} min-w-[180px]`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold">
                                    {format(new Date(booking.startTime), 'HH:mm')}
                                  </span>
                                  {booking.language && (
                                    <span className="text-sm" title={booking.language}>
                                      {LANGUAGE_FLAGS[booking.language.toUpperCase()] || booking.language}
                                    </span>
                                  )}
                                </div>
                                {booking.publicReference && (
                                  <span className="text-xs font-semibold">
                                    {booking.publicReference}
                                  </span>
                                )}
                              </div>
                              <div className="font-medium text-sm truncate">
                                {booking.customerName}
                              </div>
                              <div className="flex items-center justify-between text-xs mt-1">
                                <div className="flex items-center gap-1.5">
                                  {(booking.adults > 0 || booking.children > 0 || booking.babies > 0) ? (
                                    <>
                                      {booking.adults > 0 && <span className="font-medium">{booking.adults}A</span>}
                                      {booking.children > 0 && <span className="font-medium">{booking.children}E</span>}
                                      {booking.babies > 0 && <span className="font-medium">{booking.babies}B</span>}
                                    </>
                                  ) : (
                                    <span className="font-medium">{booking.guests} pers.</span>
                                  )}
                                </div>
                                <span className="text-sm font-semibold">
                                  {booking.status === 'CONFIRMED' && <span className="text-emerald-600">✓</span>}
                                  {booking.status === 'EMBARQUED' && <span className="text-blue-600">⛵</span>}
                                  {booking.status === 'NO_SHOW' && <span className="text-purple-600">○</span>}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                        {isDropZone && draggedBooking && (
                          <div className="flex-1 min-h-[40px] flex items-center justify-center border-2 border-dashed border-sky-400 rounded bg-sky-50 text-sky-600 text-sm font-medium">
                            Déposer ici
                          </div>
                        )}
                        {/* Bouton + pour ajouter */}
                        <button
                          onClick={() => onSlotClick(date, timeSlot, assignedBoat?.id || activeBoats[0]?.id || 1)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-sky-50 text-slate-300 hover:text-sky-600 transition"
                          title={slotBookings.length > 0 ? "Ajouter une réservation" : !assignedBoat ? "Réservation manuelle" : "Ajouter"}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Footer légende */}
      <div className="flex flex-wrap items-center gap-4 p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-400"></div>
          <span className="text-sm text-slate-700">Confirmé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 border border-blue-400"></div>
          <span className="text-sm text-slate-700">Embarqué</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-100 border border-purple-400"></div>
          <span className="text-sm text-slate-700">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-rose-100 border border-rose-400"></div>
          <span className="text-sm text-slate-700">Bloqué</span>
        </div>
        <div className="ml-auto text-sm text-slate-500">
          Glissez-déposez pour déplacer
        </div>
      </div>

      {/* Modal de confirmation de déplacement */}
      {showMoveModal && pendingMove && (
        <MoveBookingModal
          booking={pendingMove.booking}
          newTime={pendingMove.newSlot.displayTime}
          onConfirm={handleConfirmMove}
          onCancel={() => {
            setShowMoveModal(false)
            setPendingMove(null)
          }}
          isLoading={isMoveLoading}
        />
      )}

      {/* Modal de blocage */}
      {showBlockModal && pendingBlock && (
        <BlockSlotModal
          slot={pendingBlock.slot}
          date={date}
          isBlocked={pendingBlock.isBlocked}
          blockInfo={pendingBlock.blockInfo}
          onConfirm={handleConfirmBlock}
          onCancel={() => {
            setShowBlockModal(false)
            setPendingBlock(null)
          }}
          isLoading={isBlockLoading}
        />
      )}
    </div>
  )
}
