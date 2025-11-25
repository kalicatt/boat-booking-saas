'use client'

import { useState, useEffect } from 'react'
import { format, startOfDay, endOfDay } from 'date-fns'
import fr from 'date-fns/locale/fr'
import Link from 'next/link'

export default function TodayList() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalPeople: 0, count: 0 })

  // Fonction de chargement
  const fetchToday = async () => {
    const today = new Date()
    const start = startOfDay(today).toISOString()
    const end = endOfDay(today).toISOString()

    try {
      // On réutilise notre API existante
      const res = await fetch(`/api/admin/all-bookings?start=${start}&end=${end}&t=${Date.now()}`)
      const data = await res.json()
      
      setBookings(data)
      
      // Calcul des stats rapides
      const people = data.reduce((acc: number, b: any) => acc + b.numberOfPeople, 0)
      setStats({ totalPeople: people, count: data.length })
      
      setLoading(false)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchToday()
    // Auto-refresh toutes les 30 sec
    const interval = setInterval(fetchToday, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* EN-TÊTE */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-block">← Retour Tableau de bord</Link>
            <h1 className="text-3xl font-bold text-slate-800">Départs du Jour 📋</h1>
            <p className="text-slate-500">{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => window.print()}
              className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded shadow-sm hover:bg-slate-50 font-bold"
            >
              🖨️ Imprimer
            </button>
            <button 
              onClick={fetchToday}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-bold"
            >
              Actualiser
            </button>
          </div>
        </div>

        {/* RÉSUMÉ (STATS) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print:mb-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                <div className="text-xs text-slate-500 uppercase font-bold">Réservations</div>
                <div className="text-2xl font-bold">{stats.count}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                <div className="text-xs text-slate-500 uppercase font-bold">Passagers Total</div>
                <div className="text-2xl font-bold">{stats.totalPeople}</div>
            </div>
        </div>

        {/* TABLEAU LISTE */}
        <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
              <tr>
                <th className="p-4">Heure</th>
                <th className="p-4">Barque</th>
                <th className="p-4">Client</th>
                <th className="p-4">Contact (Tél / Email)</th>
                <th className="p-4 text-center">Pax</th>
                <th className="p-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center">Chargement...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Aucun départ prévu aujourd'hui.</td></tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-blue-900 text-lg">
                        {format(new Date(b.startTime), 'HH:mm')}
                    </td>
                    <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold 
                            ${b.boatId === 1 ? 'bg-blue-100 text-blue-800' : 
                              b.boatId === 2 ? 'bg-green-100 text-green-800' :
                              b.boatId === 3 ? 'bg-purple-100 text-purple-800' : 
                              'bg-orange-100 text-orange-800'}`}>
                            {b.boat.name}
                        </span>
                    </td>
                    <td className="p-4 font-medium">
                        {b.user.firstName} {b.user.lastName}
                        <div className="text-xs text-slate-400 uppercase">{b.language}</div>
                    </td>
                    <td className="p-4 text-slate-600">
                        <div className="font-bold">📞 {b.user.phone || "Non renseigné"}</div>
                        <div className="text-xs text-slate-400">{b.user.email}</div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700">
                        {b.numberOfPeople}
                    </td>
                    <td className="p-4 text-right">
                        {b.status === 'CONFIRMED' && (
                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200 text-xs font-bold">CONFIRMÉ</span>
                        )}
                        {b.status === 'CANCELLED' && (
                            <span className="text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 text-xs font-bold">ANNULÉ</span>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  )
}