'use client'

import { KPICard, KPIGrid } from './_components/KPICard'
import { DataTable } from './_components/DataTable'
import Link from 'next/link'

interface ProDashboardClientProps {
  stats: {
    todayBookings: number
    todayRevenue: number
    activeBoats: number
    pendingTasks: number
  }
  upcomingBookings: Array<{
    id: string
    time: string
    customerName: string
    guests: number
    status: string
  }>
}

export function ProDashboardClient({ stats, upcomingBookings }: ProDashboardClientProps) {
  // Calculer prochains départs (dans les 2h)
  const now = new Date()
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  
  const nextDepartures = upcomingBookings.filter(booking => {
    const [hours, minutes] = booking.time.split(':').map(Number)
    const bookingTime = new Date()
    bookingTime.setHours(hours, minutes, 0, 0)
    return bookingTime <= twoHoursFromNow && bookingTime >= now
  }).length

  return (
    <div className="space-y-6">
      {/* KPI Cards - Hero Section */}
      <KPIGrid>
        <KPICard
          title="CA du jour"
          value={`${stats.todayRevenue.toLocaleString('fr-FR')}€`}
          icon="💶"
          variant="success"
          trend={{ value: 12, label: 'vs hier' }}
          subtitle="Objectif: 2 500€"
        />
        <KPICard
          title="Départs dans 2h"
          value={nextDepartures}
          icon="⏰"
          variant={nextDepartures > 0 ? 'warning' : 'default'}
          subtitle={`${stats.todayBookings} résa aujourd'hui`}
          action={nextDepartures > 0 ? {
            label: 'Voir départs',
            onClick: () => window.location.href = '/admin/today'
          } : undefined}
        />
        <KPICard
          title="Barques en mer"
          value={stats.activeBoats}
          icon="🚤"
          variant="info"
          subtitle="Flotte disponible"
        />
        <KPICard
          title="Tâches urgentes"
          value={stats.pendingTasks}
          icon="⚠️"
          variant={stats.pendingTasks > 5 ? 'danger' : stats.pendingTasks > 0 ? 'warning' : 'success'}
          action={stats.pendingTasks > 0 ? {
            label: 'Traiter',
            onClick: () => window.location.href = '/admin/today'
          } : undefined}
        />
      </KPIGrid>

      {/* Stats secondaires */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">85%</div>
          <div className="text-sm text-slate-600 mt-1">Taux remplissage</div>
          <div className="text-xs text-emerald-600 mt-1">↑ +8% vs semaine</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">42€</div>
          <div className="text-sm text-slate-600 mt-1">Panier moyen</div>
          <div className="text-xs text-emerald-600 mt-1">↑ +3€ vs hier</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">2.5h</div>
          <div className="text-sm text-slate-600 mt-1">Durée moyenne</div>
          <div className="text-xs text-slate-500 mt-1">= stable</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">3%</div>
          <div className="text-sm text-slate-600 mt-1">Taux annulation</div>
          <div className="text-xs text-emerald-600 mt-1">↓ -2% vs mois</div>
        </div>
      </div>


      {/* Prochains départs - Timeline */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Prochains départs</h2>
            <p className="text-sm text-slate-600">Réservations à venir aujourd&apos;hui</p>
          </div>
          <Link
            href="/admin/planning"
            className="text-sm font-medium text-sky-600 hover:text-sky-700"
          >
            Planning complet →
          </Link>
        </div>

        <div className="p-4">
          <DataTable
            columns={[
              { 
                key: 'time', 
                label: 'Heure', 
                width: '100px',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{row.time}</span>
                  </div>
                )
              },
              { key: 'customerName', label: 'Client', sortable: true },
              { 
                key: 'guests', 
                label: 'Personnes', 
                width: '100px',
                render: (row) => (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-600">👥</span>
                    <span className="font-medium">{row.guests}</span>
                  </div>
                )
              },
              {
                key: 'status',
                label: 'Statut',
                width: '140px',
                render: (row) => (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    row.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                    row.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {row.status === 'CONFIRMED' ? '✓ Confirmé' : row.status === 'PENDING' ? '⏳ En attente' : row.status}
                  </span>
                )
              }
            ]}
            data={upcomingBookings}
            onRowClick={(row) => window.location.href = `/admin/reservations/${row.id}`}
            actions={(row) => (
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    window.location.href = `/admin/reservations/${row.id}`
                  }}
                  className="text-sm text-sky-600 hover:text-sky-700 font-medium"
                >
                  Détails
                </button>
              </div>
            )}
            emptyMessage="🎉 Aucun départ prévu pour le moment"
          />
        </div>
      </div>
    </div>
  )
}
