'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
}

interface QuickEditModalProps {
  booking: Booking
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Booking>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const STATUS_CONFIG = {
  CONFIRMED: {
    label: 'Confirmé',
    activeBg: 'bg-emerald-600'
  },
  EMBARQUED: {
    label: 'Embarqué',
    activeBg: 'bg-blue-600'
  },
  NO_SHOW: {
    label: 'Absent',
    activeBg: 'bg-purple-600'
  },
  PENDING: {
    label: 'En attente',
    activeBg: 'bg-amber-600'
  },
  CANCELLED: {
    label: 'Annulé',
    activeBg: 'bg-rose-600'
  }
}

type CheckinStatus = 'CONFIRMED' | 'EMBARQUED' | 'NO_SHOW'
const CHECKIN_STATUSES: CheckinStatus[] = ['CONFIRMED', 'EMBARQUED', 'NO_SHOW']

export function QuickEditModal({ booking, onClose, onUpdate, onDelete }: QuickEditModalProps) {
  const [status, setStatus] = useState<Booking['status']>(booking.status)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleStatusChange = async (newStatus: CheckinStatus) => {
    if (status === newStatus) return
    setIsLoading(true)
    try {
      await onUpdate(booking.id, { status: newStatus })
      setStatus(newStatus)
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Erreur lors de la mise à jour du statut')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete(booking.id)
      onClose()
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) return null

  const currentStatusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.CONFIRMED

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative shrink-0 bg-slate-800 text-white">
          <div className="flex items-start justify-between gap-4 px-6 py-5">
            <div className="flex-1 space-y-2">
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-300">
                Réservation {booking.publicReference || `#${booking.id.slice(0, 8)}`}
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold">
                  {format(new Date(booking.startTime), 'HH:mm', { locale: fr })}
                </span>
                <span className="text-sm font-medium text-slate-300">
                  {format(new Date(booking.startTime), 'EEEE d MMMM', { locale: fr })}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg hover:bg-white/10 transition flex items-center justify-center disabled:opacity-50"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          <div className="max-w-xl mx-auto space-y-6">
            {/* Informations client */}
            <section className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Client</h3>
              <p className="text-base font-semibold text-slate-900 mb-4">{booking.customerName}</p>
              
              {/* Contact */}
              {(booking.email || booking.phone) && (
                <div className="space-y-2 mb-4 pb-4 border-b border-slate-200">
                  {booking.email && (
                    <div>
                      <span className="text-xs text-slate-500">Email:</span>
                      <a href={`mailto:${booking.email}`} className="block text-sm text-slate-700 hover:text-blue-600 transition truncate">
                        {booking.email}
                      </a>
                    </div>
                  )}
                  {booking.phone && (
                    <div>
                      <span className="text-xs text-slate-500">Téléphone:</span>
                      <a href={`tel:${booking.phone}`} className="block text-sm text-slate-700 hover:text-blue-600 transition">
                        {booking.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center py-2 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold text-slate-900">{booking.adults}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 uppercase">Adultes</div>
                </div>
                <div className="text-center py-2 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold text-slate-900">{booking.children}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 uppercase">Enfants</div>
                </div>
                <div className="text-center py-2 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold text-slate-900">{booking.babies}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 uppercase">Bébés</div>
                </div>
                <div className="text-center py-2 bg-slate-100 rounded-lg">
                  <div className="text-lg font-bold text-slate-900">{booking.guests}</div>
                  <div className="text-[10px] text-slate-600 font-semibold mt-0.5 uppercase">Total</div>
                </div>
              </div>
            </section>

            {/* Statut */}
            <section className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Statut d'embarquement</h3>
              <div className="grid grid-cols-3 gap-2">
                {CHECKIN_STATUSES.map((statusKey) => {
                  const config = STATUS_CONFIG[statusKey]
                  const isActive = status === statusKey
                  return (
                    <button
                      key={statusKey}
                      onClick={() => handleStatusChange(statusKey)}
                      disabled={isLoading || isActive}
                      className={`
                        ${isActive ? `${config.activeBg} text-white` : 'bg-white text-slate-700 hover:bg-slate-50'}
                        px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 transition
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Suppression */}
            <section className="bg-rose-50 rounded-xl border border-rose-200 p-6">
              <h3 className="text-sm font-semibold text-rose-900 uppercase tracking-wider mb-2">Suppression</h3>
              <p className="text-sm text-rose-700 mb-4">Cette action est irréversible</p>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 bg-white border border-rose-300 text-rose-700 rounded-lg text-sm font-semibold hover:bg-rose-50 transition disabled:opacity-50"
                >
                  Supprimer cette réservation
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      {isLoading ? 'Suppression...' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
