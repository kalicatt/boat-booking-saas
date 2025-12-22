'use client'

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { writeCache, readCache } from '@/lib/mobileCache'
import { logger } from '@/lib/logger'

// Types for offline data
interface OfflineBooking {
  id: string
  date: string
  time: string
  adults: number
  children: number
  babies: number
  language: string
  totalPrice: number
  status: 'draft' | 'pending_sync' | 'synced' | 'failed'
  userDetails: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  createdAt: number
  syncedAt?: number
  error?: string
}

interface OfflineState {
  isOnline: boolean
  isCapacitor: boolean
  pendingBookings: OfflineBooking[]
  lastSyncAt: number | null
}

interface OfflineContextValue extends OfflineState {
  saveBookingDraft: (booking: Omit<OfflineBooking, 'id' | 'status' | 'createdAt'>) => Promise<string>
  syncPendingBookings: () => Promise<{ synced: number; failed: number }>
  clearOfflineData: () => Promise<void>
  getBookingDraft: (id: string) => Promise<OfflineBooking | null>
  deleteDraft: (id: string) => Promise<void>
}

const CACHE_KEYS = {
  PENDING_BOOKINGS: 'offline:pending-bookings',
  LAST_SYNC: 'offline:last-sync',
  AVAILABILITY_CACHE: 'offline:availability',
  HOURS_CACHE: 'offline:hours',
} as const

// Default context value
const defaultContext: OfflineContextValue = {
  isOnline: true,
  isCapacitor: false,
  pendingBookings: [],
  lastSyncAt: null,
  saveBookingDraft: async () => '',
  syncPendingBookings: async () => ({ synced: 0, failed: 0 }),
  clearOfflineData: async () => {},
  getBookingDraft: async () => null,
  deleteDraft: async () => {},
}

const OfflineContext = createContext<OfflineContextValue>(defaultContext)

/**
 * Hook to access offline functionality
 */
export function useOffline() {
  return useContext(OfflineContext)
}

/**
 * Check if running in Capacitor environment
 */
function isCapacitorEnv(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
}

/**
 * Generate unique ID for offline bookings
 */
function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

interface OfflineProviderProps {
  children: ReactNode
}

/**
 * Provider component for offline functionality
 */
export function OfflineProvider({ children }: OfflineProviderProps) {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    isCapacitor: false,
    pendingBookings: [],
    lastSyncAt: null,
  })

  // Initialize and load cached data
  useEffect(() => {
    const init = async () => {
      const isCapacitor = isCapacitorEnv()
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

      // Load pending bookings from cache
      const cached = await readCache<OfflineBooking[]>(CACHE_KEYS.PENDING_BOOKINGS)
      const lastSync = await readCache<number>(CACHE_KEYS.LAST_SYNC)

      setState({
        isOnline,
        isCapacitor,
        pendingBookings: cached?.payload || [],
        lastSyncAt: lastSync?.payload || null,
      })
    }

    init()

    // Listen for online/offline events
    const handleOnline = () => setState(s => ({ ...s, isOnline: true }))
    const handleOffline = () => setState(s => ({ ...s, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (state.isOnline && state.pendingBookings.some(b => b.status === 'pending_sync')) {
      syncPendingBookings()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isOnline])

  /**
   * Save a booking draft for offline use
   */
  const saveBookingDraft = useCallback(async (
    booking: Omit<OfflineBooking, 'id' | 'status' | 'createdAt'>
  ): Promise<string> => {
    const id = generateOfflineId()
    const newBooking: OfflineBooking = {
      ...booking,
      id,
      status: 'draft',
      createdAt: Date.now(),
    }

    setState(prev => {
      const updated = [...prev.pendingBookings, newBooking]
      writeCache(CACHE_KEYS.PENDING_BOOKINGS, updated)
      return { ...prev, pendingBookings: updated }
    })

    logger.info({ bookingId: id }, 'Offline booking draft saved')
    return id
  }, [])

  /**
   * Get a specific booking draft
   */
  const getBookingDraft = useCallback(async (id: string): Promise<OfflineBooking | null> => {
    return state.pendingBookings.find(b => b.id === id) || null
  }, [state.pendingBookings])

  /**
   * Delete a draft booking
   */
  const deleteDraft = useCallback(async (id: string): Promise<void> => {
    setState(prev => {
      const updated = prev.pendingBookings.filter(b => b.id !== id)
      writeCache(CACHE_KEYS.PENDING_BOOKINGS, updated)
      return { ...prev, pendingBookings: updated }
    })
    logger.info({ bookingId: id }, 'Offline booking draft deleted')
  }, [])

  /**
   * Sync all pending bookings with the server
   */
  const syncPendingBookings = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (!state.isOnline) {
      return { synced: 0, failed: 0 }
    }

    const pendingToSync = state.pendingBookings.filter(b => b.status === 'pending_sync')
    let synced = 0
    let failed = 0

    const updatedBookings = [...state.pendingBookings]

    for (const booking of pendingToSync) {
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: booking.date,
            time: booking.time,
            adults: booking.adults,
            children: booking.children,
            babies: booking.babies,
            language: booking.language,
            userDetails: booking.userDetails,
            offlineId: booking.id,
          }),
        })

        const idx = updatedBookings.findIndex(b => b.id === booking.id)
        if (idx === -1) continue

        if (response.ok) {
          updatedBookings[idx] = {
            ...booking,
            status: 'synced',
            syncedAt: Date.now(),
          }
          synced++
          logger.info({ bookingId: booking.id }, 'Offline booking synced successfully')
        } else {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }))
          updatedBookings[idx] = {
            ...booking,
            status: 'failed',
            error: error.error || 'Sync failed',
          }
          failed++
          logger.warn({ bookingId: booking.id, error }, 'Offline booking sync failed')
        }
      } catch (error) {
        const idx = updatedBookings.findIndex(b => b.id === booking.id)
        if (idx !== -1) {
          updatedBookings[idx] = {
            ...booking,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Network error',
          }
        }
        failed++
        logger.error({ bookingId: booking.id, error }, 'Offline booking sync error')
      }
    }

    const now = Date.now()
    await writeCache(CACHE_KEYS.PENDING_BOOKINGS, updatedBookings)
    await writeCache(CACHE_KEYS.LAST_SYNC, now)

    setState(prev => ({
      ...prev,
      pendingBookings: updatedBookings,
      lastSyncAt: now,
    }))

    return { synced, failed }
  }, [state.isOnline, state.pendingBookings])

  /**
   * Clear all offline data
   */
  const clearOfflineData = useCallback(async (): Promise<void> => {
    await writeCache(CACHE_KEYS.PENDING_BOOKINGS, [])
    await writeCache(CACHE_KEYS.LAST_SYNC, null)
    setState(prev => ({
      ...prev,
      pendingBookings: [],
      lastSyncAt: null,
    }))
    logger.info('Offline data cleared')
  }, [])

  const value: OfflineContextValue = {
    ...state,
    saveBookingDraft,
    syncPendingBookings,
    clearOfflineData,
    getBookingDraft,
    deleteDraft,
  }

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  )
}

/**
 * Offline status indicator component
 */
export function OfflineIndicator() {
  const { isOnline, pendingBookings } = useOffline()
  const pendingCount = pendingBookings.filter(b => b.status === 'pending_sync').length

  if (isOnline && pendingCount === 0) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50">
      <div className={`rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 ${
        isOnline ? 'bg-amber-50 border border-amber-200' : 'bg-slate-800 text-white'
      }`}>
        {!isOnline ? (
          <>
            <span className="text-lg">📴</span>
            <div>
              <p className="font-medium text-sm">Mode hors-ligne</p>
              <p className="text-xs opacity-75">Les modifications seront synchronisées</p>
            </div>
          </>
        ) : pendingCount > 0 ? (
          <>
            <span className="text-lg">🔄</span>
            <div>
              <p className="font-medium text-sm text-amber-800">
                {pendingCount} réservation{pendingCount > 1 ? 's' : ''} en attente
              </p>
              <p className="text-xs text-amber-600">Synchronisation en cours...</p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Cache availability data for offline use
 */
export async function cacheAvailability(date: string, slots: string[]): Promise<void> {
  const cached = await readCache<Record<string, { slots: string[]; timestamp: number }>>(
    CACHE_KEYS.AVAILABILITY_CACHE
  )
  const data = cached?.payload || {}
  data[date] = { slots, timestamp: Date.now() }
  
  // Keep only last 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  for (const key of Object.keys(data)) {
    if (data[key].timestamp < cutoff) {
      delete data[key]
    }
  }
  
  await writeCache(CACHE_KEYS.AVAILABILITY_CACHE, data)
}

/**
 * Get cached availability for a date
 */
export async function getCachedAvailability(date: string): Promise<string[] | null> {
  const cached = await readCache<Record<string, { slots: string[]; timestamp: number }>>(
    CACHE_KEYS.AVAILABILITY_CACHE
  )
  const entry = cached?.payload?.[date]
  
  // Return if less than 1 hour old
  if (entry && Date.now() - entry.timestamp < 60 * 60 * 1000) {
    return entry.slots
  }
  
  return null
}

/**
 * Cache business hours for offline use
 */
export async function cacheHours(hours: unknown): Promise<void> {
  await writeCache(CACHE_KEYS.HOURS_CACHE, hours)
}

/**
 * Get cached business hours
 */
export async function getCachedHours<T>(): Promise<T | null> {
  const cached = await readCache<T>(CACHE_KEYS.HOURS_CACHE)
  return cached?.payload || null
}
