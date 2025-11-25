'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns'
import fr from 'date-fns/locale/fr'

type TimeRange = 'day' | 'month' | 'year'

export default function StatsPage() {
  const [range, setRange] = useState<TimeRange>('month') // Par défaut : Mois
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fonction pour calculer les dates de début et fin selon le filtre
  const fetchStats = async () => {
    setLoading(true)
    const now = new Date()
    let start, end

    if (range === 'day') {
      start = startOfDay(now)
      end = endOfDay(now)
    } else if (range === 'month') {
      start = startOfMonth(now)
      end = endOfMonth(now)
    } else {
      start = startOfYear(now)
      end = endOfYear(now)
    }

    try {
      const res = await fetch(`/api/admin/stats?start=${start.toISOString()}&end=${end.toISOString()}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [range])

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* EN-TÊTE */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-block">← Retour Tableau de bord</Link>
            <h1 className="text-3xl font-bold text-slate-800">Statistiques & Performances 📊</h1>
          </div>

          {/* FILTRES */}
          <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-200 flex">
            <button 
              onClick={() => setRange('day')}
              className={`px-4 py-2 text-sm font-bold rounded-md transition ${range === 'day' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Aujourd'hui
            </button>
            <button 
              onClick={() => setRange('month')}
              className={`px-4 py-2 text-sm font-bold rounded-md transition ${range === 'month' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Ce Mois
            </button>
            <button 
              onClick={() => setRange('year')}
              className={`px-4 py-2 text-sm font-bold rounded-md transition ${range === 'year' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Cette Année
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Calcul des données...</div>
        ) : data ? (
          <>
            {/* 1. CHIFFRES CLÉS (CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Chiffre d'Affaires</h3>
                <p className="text-4xl font-bold text-slate-800 mt-2">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.revenue)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Passagers Totaux</h3>
                <p className="text-4xl font-bold text-slate-800 mt-2">{data.passengers}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Réservations</h3>
                <p className="text-4xl font-bold text-slate-800 mt-2">{data.bookingsCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 2. RÉPARTITION LANGUES */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Langues demandées 🌍</h3>
                <div className="space-y-4">
                  {data.byLanguage.map((l: any) => {
                    // Calcul du pourcentage
                    const percent = Math.round((l._count.id / data.bookingsCount) * 100) || 0
                    return (
                      <div key={l.language}>
                        <div className="flex justify-between text-sm font-bold mb-1">
                          <span>{l.language}</span>
                          <span>{percent}% ({l._count.id})</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${l.language === 'FR' ? 'bg-blue-500' : l.language === 'EN' ? 'bg-red-500' : 'bg-yellow-500'}`} 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                  {data.byLanguage.length === 0 && <div className="text-slate-400 text-sm">Pas de données.</div>}
                </div>
              </div>

              {/* 3. PERFORMANCE BARQUES */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Performance par Barque 🛶</h3>
                <div className="space-y-4">
                  {data.byBoat.map((boat: any) => {
                    // On cherche le max pour faire une barre relative
                    const maxPeople = Math.max(...data.byBoat.map((b:any) => b.people))
                    const width = maxPeople > 0 ? (boat.people / maxPeople) * 100 : 0
                    
                    return (
                      <div key={boat.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-bold text-slate-700">{boat.name}</span>
                          <span className="text-slate-500">{boat.people} passagers</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div 
                            className="bg-green-500 h-2.5 rounded-full" 
                            style={{ width: `${width}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                  {data.byBoat.length === 0 && <div className="text-slate-400 text-sm">Pas de données.</div>}
                </div>
              </div>

            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}