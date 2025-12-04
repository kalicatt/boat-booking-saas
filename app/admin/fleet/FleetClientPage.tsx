'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { AdminPageShell } from '../_components/AdminPageShell'

const fetcher = (url: string) => fetch(url).then((response) => {
  if (!response.ok) throw new Error('Fleet API unavailable')
  return response.json()
})

type FleetLog = {
  id: string
  type: string
  description?: string | null
  performedBy?: string | null
  cost?: number | null
  createdAt: string
}

type FleetBoat = {
  id: number
  name: string
  status: string
  capacity: number
  batteryCycleDays: number
  lastChargeDate: string
  batteryAlert: 'OK' | 'WARNING' | 'CRITICAL'
  daysSinceCharge: number
  totalTrips: number
  tripsSinceService: number
  hoursSinceService: number
  mechanicalAlert: boolean
  maintenanceLogs: FleetLog[]
}

type FleetStats = {
  total: number
  criticalBatteries: number
  warningBatteries: number
  mechanicalAlerts: number
  maintenance: number
}

type FleetResponse = {
  generatedAt: string
  stats: FleetStats
  boats: FleetBoat[]
}

type ToastState = { type: 'success' | 'error'; message: string } | null

const badgeVariants: Record<string, string> = {
  OK: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  WARNING: 'bg-amber-100 text-amber-700 border border-amber-200',
  CRITICAL: 'bg-rose-100 text-rose-700 border border-rose-200'
}

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-sky-100 text-sky-700 border border-sky-200',
  MAINTENANCE: 'bg-slate-900 text-white border border-slate-900'
}

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function FleetClientPage() {
  const { data, error, isLoading, mutate } = useSWR<FleetResponse>('/api/admin/fleet', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false
  })
  const [toast, setToast] = useState<ToastState>(null)
  const [pendingBoatId, setPendingBoatId] = useState<number | null>(null)
  const [incidentTarget, setIncidentTarget] = useState<FleetBoat | null>(null)

  const stats = data?.stats ?? { total: 0, criticalBatteries: 0, warningBatteries: 0, mechanicalAlerts: 0, maintenance: 0 }
  const boats = useMemo(() => data?.boats ?? [], [data])

  const showToast = (payload: ToastState) => {
    setToast(payload)
    if (payload) {
      setTimeout(() => setToast(null), 3500)
    }
  }

  const handleCharge = async (boatId: number) => {
    try {
      setPendingBoatId(boatId)
      const response = await fetch('/api/admin/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'charge', boatId })
      })
      if (!response.ok) throw new Error('Charge failed')
      await mutate()
      showToast({ type: 'success', message: 'Charge enregistrée.' })
    } catch (err) {
      console.error(err)
      showToast({ type: 'error', message: 'Impossible de marquer la charge.' })
    } finally {
      setPendingBoatId(null)
    }
  }

  const handleIncident = async (boatId: number, description: string) => {
    try {
      setPendingBoatId(boatId)
      const response = await fetch('/api/admin/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'incident', boatId, description })
      })
      if (!response.ok) throw new Error('Incident failed')
      await mutate()
      showToast({ type: 'success', message: 'Incident signalé.' })
    } catch (err) {
      console.error(err)
      showToast({ type: 'error', message: "Impossible d'enregistrer l'incident." })
    } finally {
      setPendingBoatId(null)
      setIncidentTarget(null)
    }
  }

  const reload = () => mutate()

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-sm text-slate-500">Chargement du parc...</p>
    }
    if (error) {
      return (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Erreur de chargement de la flotte. {error instanceof Error ? error.message : ''}
        </div>
      )
    }
    if (!boats.length) {
      return <p className="text-sm text-slate-500">Aucune barque enregistrée.</p>
    }
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        {boats.map((boat) => {
          const batteryClass = badgeVariants[boat.batteryAlert]
          const statusClass = statusBadge[boat.status] ?? 'bg-slate-100 text-slate-700'
          return (
            <article key={boat.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{boat.name}</h3>
                  <p className="text-sm text-slate-500">Capacité {boat.capacity} pers.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className={`rounded-full px-3 py-1 ${statusClass}`}>{boat.status}</span>
                  <span className={`rounded-full px-3 py-1 ${batteryClass}`}>
                    Batterie · {boat.batteryAlert}
                  </span>
                  {boat.mechanicalAlert ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
                      Révision
                    </span>
                  ) : null}
                </div>
              </header>

              <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Cycle</dt>
                  <dd className="text-base text-slate-900">
                    J+{boat.daysSinceCharge} / J+{boat.batteryCycleDays}
                  </dd>
                  <p className="text-xs text-slate-400">Dernière charge : {formatDateTime(boat.lastChargeDate)}</p>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Mécanique</dt>
                  <dd className="text-base text-slate-900">{boat.tripsSinceService} sorties</dd>
                  <p className="text-xs text-slate-400">{boat.hoursSinceService.toFixed(1)} h depuis révision</p>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleCharge(boat.id)}
                  disabled={pendingBoatId === boat.id}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                >
                  ⚡ Marquer chargée
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentTarget(boat)}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  🛠️ Signaler incident
                </button>
              </div>

              <section className="mt-4 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Historique</h4>
                <ul className="mt-2 space-y-2">
                  {boat.maintenanceLogs.length ? (
                    boat.maintenanceLogs.slice(0, 3).map((entry) => (
                      <li key={entry.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                          <span>{entry.type}</span>
                          <span>{formatDateTime(entry.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{entry.description || '—'}</p>
                        {entry.performedBy ? (
                          <p className="text-[11px] text-slate-400">Par {entry.performedBy}</p>
                        ) : null}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Aucune intervention récente.</li>
                  )}
                </ul>
              </section>
            </article>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <AdminPageShell
        title="Fleet & Safety"
        description="Surveillez les cycles batterie, le carnet de santé et les incidents en temps réel."
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Rafraîchir
            </button>
          </div>
        )}
        footerNote="Module Fleet & Safety — Phase 3"
      >
        <section className="grid gap-4 md:grid-cols-5">
          <StatCard label="Total flotte" value={stats.total} helper="Barques actives" />
          <StatCard label="Batteries critiques" value={stats.criticalBatteries} tone="danger" helper="À charger immédiatement" />
          <StatCard label="Alerte J+3" value={stats.warningBatteries} tone="warning" helper="Prévoir ce soir" />
          <StatCard label="Révision mécanique" value={stats.mechanicalAlerts} tone="warning" helper=">= 500 sorties" />
          <StatCard label="En maintenance" value={stats.maintenance} helper="Indisponibles" />
        </section>

        {toast ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        {renderContent()}
      </AdminPageShell>

      {incidentTarget ? (
        <IncidentModal
          boat={incidentTarget}
          onClose={() => setIncidentTarget(null)}
          onSubmit={handleIncident}
          pending={pendingBoatId === incidentTarget.id}
        />
      ) : null}
    </>
  )
}

type StatCardProps = {
  label: string
  value: number
  helper?: string
  tone?: 'default' | 'warning' | 'danger'
}

function StatCard({ label, value, helper, tone = 'default' }: StatCardProps) {
  const palette = {
    default: 'bg-white border-slate-200 text-slate-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-900'
  }[tone]
  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${palette}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {helper ? <p className="text-sm text-slate-500">{helper}</p> : null}
    </article>
  )
}

type IncidentModalProps = {
  boat: FleetBoat
  onClose: () => void
  onSubmit: (boatId: number, description: string) => Promise<void>
  pending: boolean
}

function IncidentModal({ boat, onClose, onSubmit, pending }: IncidentModalProps) {
  const [description, setDescription] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(boat.id, description)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-slate-900">Signaler un incident</h2>
        <p className="text-sm text-slate-500">{boat.name}</p>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Détails
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Rame cassée, fuite, batterie faible..."
            required
          />
        </label>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-60"
          >
            Valider
          </button>
        </div>
      </form>
    </div>
  )
}
