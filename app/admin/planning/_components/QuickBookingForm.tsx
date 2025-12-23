'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BookingFormData {
  customerName: string
  phone: string
  email: string
  guests: number
  duration: number
}

interface QuickBookingFormProps {
  date: Date
  hour: number
  boatId: number
  boatName: string
  onSubmit: (data: BookingFormData) => Promise<void>
  onCancel: () => void
}

export function QuickBookingForm({ date, hour, boatId, boatName, onSubmit, onCancel }: QuickBookingFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<BookingFormData>({
    customerName: '',
    phone: '',
    email: '',
    guests: 2,
    duration: 2
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        customerName: '',
        phone: '',
        email: '',
        guests: 2,
        duration: 2
      })
    } catch (error) {
      console.error('Error creating booking:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedDateTime = new Date(date)
  selectedDateTime.setHours(hour, 0, 0, 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Nouvelle réservation</h2>
              <p className="text-sm text-slate-600 mt-1">
                {boatName} • {format(selectedDateTime, 'EEEE d MMMM yyyy', { locale: fr })} à {hour}:00
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nom client */}
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 mb-1">
              Nom du client *
            </label>
            <input
              id="customerName"
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
              placeholder="Jean Dupont"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              Téléphone *
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
              placeholder="jean.dupont@example.com"
            />
          </div>

          {/* Nombre de personnes */}
          <div>
            <label htmlFor="guests" className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de personnes *
            </label>
            <select
              id="guests"
              required
              value={formData.guests}
              onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num} personne{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Durée */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1">
              Durée *
            </label>
            <select
              id="duration"
              required
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            >
              <option value={1}>1 heure</option>
              <option value={2}>2 heures</option>
              <option value={3}>3 heures</option>
              <option value={4}>4 heures</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
