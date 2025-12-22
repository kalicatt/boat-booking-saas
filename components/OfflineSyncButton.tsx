'use client'

import { useOffline } from '@/lib/offlineMode'

/**
 * Offline sync button for admin toolbar
 * Shows sync status and allows manual sync trigger
 */
export default function OfflineSyncButton() {
  const { isOnline, pendingBookings, syncPendingBookings, lastSyncAt } = useOffline()
  
  const pendingCount = pendingBookings.filter(b => b.status === 'pending_sync').length
  const failedCount = pendingBookings.filter(b => b.status === 'failed').length
  const draftCount = pendingBookings.filter(b => b.status === 'draft').length

  const handleSync = async () => {
    if (!isOnline) return
    const result = await syncPendingBookings()
    if (result.synced > 0 || result.failed > 0) {
      // Could show a toast notification here
      console.log(`Sync complete: ${result.synced} synced, ${result.failed} failed`)
    }
  }

  // Format last sync time
  const formatLastSync = () => {
    if (!lastSyncAt) return 'Jamais'
    const diff = Date.now() - lastSyncAt
    if (diff < 60000) return 'À l\'instant'
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
    return new Date(lastSyncAt).toLocaleDateString('fr-FR')
  }

  return (
    <div className="flex items-center gap-2">
      {/* Connection status indicator */}
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} 
           title={isOnline ? 'En ligne' : 'Hors ligne'} />
      
      {/* Pending count badge */}
      {(pendingCount > 0 || failedCount > 0 || draftCount > 0) && (
        <div className="flex items-center gap-1 text-xs">
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              {pendingCount} en attente
            </span>
          )}
          {failedCount > 0 && (
            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
              {failedCount} échec
            </span>
          )}
          {draftCount > 0 && (
            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
              {draftCount} brouillon
            </span>
          )}
        </div>
      )}

      {/* Sync button */}
      <button
        onClick={handleSync}
        disabled={!isOnline || pendingCount === 0}
        className={`p-2 rounded-lg transition-colors ${
          isOnline && pendingCount > 0
            ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
        title={`Dernière sync: ${formatLastSync()}`}
      >
        <svg 
          className={`w-4 h-4 ${pendingCount > 0 && isOnline ? 'animate-spin' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
      </button>
    </div>
  )
}

/**
 * Offline banner for pages
 * Shows when user is offline with helpful message
 */
export function OfflineBanner() {
  const { isOnline } = useOffline()

  if (isOnline) return null

  return (
    <div className="bg-slate-800 text-white px-4 py-2 text-center text-sm">
      <span className="mr-2">📴</span>
      Vous êtes hors-ligne. Les données affichées peuvent ne pas être à jour.
    </div>
  )
}

/**
 * Pending bookings list for offline management
 */
export function PendingBookingsList() {
  const { pendingBookings, deleteDraft, syncPendingBookings, isOnline } = useOffline()

  if (pendingBookings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <span className="text-4xl mb-2 block">📋</span>
        <p>Aucune réservation en attente</p>
      </div>
    )
  }

  const handleRetrySync = async () => {
    await syncPendingBookings()
  }

  return (
    <div className="space-y-3">
      {pendingBookings.map((booking) => (
        <div 
          key={booking.id}
          className={`p-4 rounded-xl border ${
            booking.status === 'synced' 
              ? 'bg-green-50 border-green-200'
              : booking.status === 'failed'
              ? 'bg-red-50 border-red-200'
              : booking.status === 'pending_sync'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">
                  {booking.userDetails.firstName} {booking.userDetails.lastName}
                </span>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-sm text-slate-600">
                {new Date(booking.date).toLocaleDateString('fr-FR')} à {booking.time}
              </p>
              <p className="text-sm text-slate-500">
                {booking.adults + booking.children + booking.babies} pers. • {booking.totalPrice}€
              </p>
              {booking.error && (
                <p className="text-xs text-red-600 mt-1">{booking.error}</p>
              )}
            </div>
            
            <div className="flex gap-1">
              {booking.status === 'draft' && (
                <button
                  onClick={() => deleteDraft(booking.id)}
                  className="p-2 text-slate-400 hover:text-red-500"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              {booking.status === 'failed' && isOnline && (
                <button
                  onClick={handleRetrySync}
                  className="p-2 text-amber-600 hover:text-amber-700"
                  title="Réessayer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    draft: { label: 'Brouillon', class: 'bg-slate-200 text-slate-700' },
    pending_sync: { label: 'En attente', class: 'bg-amber-200 text-amber-800' },
    synced: { label: 'Synchronisé', class: 'bg-green-200 text-green-800' },
    failed: { label: 'Échec', class: 'bg-red-200 text-red-800' },
  }[status] || { label: status, class: 'bg-slate-200 text-slate-700' }

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${config.class}`}>
      {config.label}
    </span>
  )
}
