'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay 
} from 'date-fns'
import { fr } from 'date-fns/locale' // <--- CORRECTION ICI
import Link from 'next/link'

// Type pour le mode de vue
type ViewMode = 'day' | 'week' | 'month'

export default function BookingList() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalPeople: 0, count: 0 })
  
  import { auth } from '@/auth'
  import { redirect } from 'next/navigation'
  import { createLog } from '@/lib/logger'
  import dynamic from 'next/dynamic'

  const ClientPage = dynamic(() => import('./ClientPage'), { ssr: false })

  export default async function TodayPage() {
    const session = await auth()

    if (!session || !session.user) {
      return redirect('/login')
    }

    const role = (session.user as any).role
    const isAllowed = role === 'ADMIN' || role === 'SUPERADMIN'

    if (!isAllowed) {
      await createLog('UNAUTHORIZED_TODAY', {
        userId: session.user.id,
        email: session.user.email,
        role,
        path: '/admin/today'
      })
      return redirect('/admin')
    }

    return <ClientPage />
  }
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
                {/* On change l'entête selon la vue */}
                <th className="p-4">{viewMode === 'day' ? 'Heure' : 'Date & Heure'}</th>
                <th className="p-4">Barque</th>
                <th className="p-4">Client</th>
                <th className="p-4">Contact</th>
                <th className="p-4 text-center">Pax</th>
                <th className="p-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center">Chargement...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Aucun départ sur cette période.</td></tr>
              ) : (
                bookings.map((b, index) => {
                  // Logique pour afficher une séparation si on change de jour dans la liste
                  const showDateSeparator = viewMode !== 'day' && (index === 0 || !isSameDay(new Date(b.startTime), new Date(bookings[index-1].startTime)));
                  
                  return (
                    <>
                      {/* Séparateur de date visuel pour les vues semaines/mois */}
                      {showDateSeparator && (
                          <tr className="bg-slate-100 border-y border-slate-200">
                              <td colSpan={6} className="px-4 py-2 font-bold text-slate-600 uppercase text-xs">
                                  {format(new Date(b.startTime), 'EEEE d MMMM', { locale: fr })}
                              </td>
                          </tr>
                      )}
                      <tr key={b.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-blue-900 text-lg">
                            {(() => {
                              const d = new Date(b.startTime)
                              const hh = String(d.getUTCHours()).padStart(2, '0')
                              const mm = String(d.getUTCMinutes()).padStart(2, '0')
                              return `${hh}:${mm}`
                            })()}
                            {/* Petit rappel de la date si on est en vue semaine/mois pour l'impression */}
                            {viewMode !== 'day' && <div className="text-[10px] text-slate-400 font-normal print:block hidden">{(() => {
                              const d = new Date(b.startTime)
                              const y = d.getUTCFullYear()
                              const m = d.getUTCMonth()
                              const day = d.getUTCDate()
                              const wall = new Date(Date.UTC(y, m, day))
                              return format(wall, 'dd/MM')
                            })()}</div>}
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
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  )
}