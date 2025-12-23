'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { AdminPageShell } from '../_components/AdminPageShell'

const fetcher = (url: string) => fetch(url).then((response) => {
  if (!response.ok) throw new Error('Fleet API unavailable')
  return response.json()
})

const quotaFetcher = (dayKey: string | null) => {
  if (!dayKey) return Promise.resolve(null)
  return fetch(`/api/admin/fleet/quota?day=${encodeURIComponent(dayKey)}`).then((response) => {
    if (!response.ok) throw new Error('Quota API unavailable')
    return response.json()
  })
}

const toDateInputValue = (value: Date) => {
  const pad = (num: number) => String(num).padStart(2, '0')
  const year = value.getFullYear()
  const month = pad(value.getMonth() + 1)
  const day = pad(value.getDate())
  return `${year}-${month}-${day}`
}

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
  planningName: string
  fleetLabel?: string | null
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
  manifest?: string | null
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
  viewerRole?: string | null
}

type FleetQuotaResponse = {
  day: string
  boatsAvailable: number
  note?: string | null
  exists: boolean
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

const adminManifestRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']

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
  const [editTarget, setEditTarget] = useState<FleetBoat | null>(null)
  const [selectedQuotaDay, setSelectedQuotaDay] = useState(() => toDateInputValue(new Date()))
  const { data: quotaData, isLoading: quotaIsLoading, mutate: mutateQuota } = useSWR<FleetQuotaResponse | null>(
    selectedQuotaDay ? `quota-${selectedQuotaDay}` : null,
    () => quotaFetcher(selectedQuotaDay)
  )
  const [quotaValue, setQuotaValue] = useState(4)
  const [quotaNote, setQuotaNote] = useState('')
  const [quotaSubmitting, setQuotaSubmitting] = useState(false)
  const viewerRole = data?.viewerRole ?? null
  const canResetManifest = viewerRole ? adminManifestRoles.includes(viewerRole) : false

  useEffect(() => {
    if (quotaData) {
      setQuotaValue(quotaData.boatsAvailable ?? 4)
      setQuotaNote(quotaData.note ?? '')
    }
  }, [quotaData])

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
      const payload = (await response.json().catch(() => null)) as { releaseCount?: number; error?: string } | null
      if (!response.ok) throw new Error(payload?.error ?? 'Incident failed')
      await mutate()
      const releaseCount = payload?.releaseCount ?? 0
      const incidentMessage =
        releaseCount > 0
          ? `Incident signalé. ${releaseCount} réservation(s) à réaffecter.`
          : 'Incident signalé.'
      showToast({ type: 'success', message: incidentMessage })
    } catch (err) {
      console.error(err)
      showToast({ type: 'error', message: "Impossible d'enregistrer l'incident." })
    } finally {
      setPendingBoatId(null)
      setIncidentTarget(null)
    }
  }

  const handleQuotaSave = async () => {
    if (!selectedQuotaDay) return
    try {
      setQuotaSubmitting(true)
      const response = await fetch('/api/admin/fleet/quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: selectedQuotaDay,
          boatsAvailable: quotaValue,
          note: quotaNote || null
        })
      })
      if (!response.ok) throw new Error('Quota save failed')
      await mutateQuota()
      showToast({ type: 'success', message: 'Capacité journalière enregistrée.' })
    } catch (err) {
      console.error(err)
      showToast({ type: 'error', message: 'Impossible de mettre à jour la capacité.' })
    } finally {
      setQuotaSubmitting(false)
    }
  }

  const handleResetManifest = async (boatId: number): Promise<boolean> => {
    if (!canResetManifest) return false
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Confirmer la réinitialisation du manifeste ?')
      if (!confirmed) return false
    }
    try {
      setPendingBoatId(boatId)
      const response = await fetch('/api/admin/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetManifest', boatId })
      })
      if (!response.ok) throw new Error('Reset manifest failed')
      await mutate()
      showToast({ type: 'success', message: 'Manifeste vidé.' })
      return true
    } catch (err) {
      console.error(err)
      showToast({ type: 'error', message: 'Impossible de réinitialiser le manifeste.' })
      return false
    } finally {
      setPendingBoatId(null)
    }
  }

  const handleUpdateBoat = async (
    boatId: number,
    payload: { name?: string; fleetLabel?: string | null; manifest?: string | null; lastChargeDate?: string | null; batteryCycleDays?: number }
  ) => {
    try {
      setPendingBoatId(boatId)
      const body: Record<string, unknown> = { action: 'update', boatId }
      if (typeof payload.name === 'string') body.name = payload.name
      if (payload.fleetLabel !== undefined) body.fleetLabel = payload.fleetLabel
      if (payload.manifest !== undefined) body.manifest = payload.manifest
      if (payload.lastChargeDate) body.lastChargeDate = payload.lastChargeDate
      if (typeof payload.batteryCycleDays === 'number') body.batteryCycleDays = payload.batteryCycleDays

      const response = await fetch('/api/admin/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!response.ok) throw new Error('Update failed')
      await mutate()
      showToast({ type: 'success', message: 'Barque mise à jour.' })
      setEditTarget(null)
    } catch (err) {
      console.error(err)
      showToast({ type: 'error', message: 'Impossible de mettre à jour la barque.' })
    } finally {
      setPendingBoatId(null)
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
            <article key={boat.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 transition-colors group-hover:text-slate-700">{boat.name}</h3>
                  <p className="text-sm font-medium text-slate-500">Capacité {boat.capacity} pers.</p>
                  <p className="text-xs text-slate-400">Nom planning : {boat.planningName}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className={`rounded-full px-3 py-1 shadow-sm ${statusClass}`}>{boat.status}</span>
                  <span className={`rounded-full px-3 py-1 shadow-sm ${batteryClass}`}>
                    Batterie · {boat.batteryAlert}
                  </span>
                  {boat.mechanicalAlert ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800 shadow-sm">
                      Révision
                    </span>
                  ) : null}
                </div>
              </header>

              <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Cycle</dt>
                  <dd className="text-lg font-bold text-slate-900">
                    J+{boat.daysSinceCharge} / J+{boat.batteryCycleDays}
                  </dd>
                  <p className="text-xs text-slate-400">Dernière charge : {formatDateTime(boat.lastChargeDate)}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Mécanique</dt>
                  <dd className="text-lg font-bold text-slate-900">{boat.tripsSinceService} sorties</dd>
                  <p className="text-xs text-slate-400">{boat.hoursSinceService.toFixed(1)} h depuis révision</p>
                </div>
              </dl>

              {boat.manifest ? (
                <section className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    <span>Manifeste</span>
                    {canResetManifest ? (
                      <button
                        type="button"
                        onClick={() => void handleResetManifest(boat.id)}
                        disabled={pendingBoatId === boat.id}
                        className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-white disabled:opacity-50"
                      >
                        ♻️ Réinitialiser
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{boat.manifest}</p>
                </section>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setEditTarget(boat)}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-500 hover:bg-slate-50 hover:text-slate-900"
                >
                  ✏️ Renommer / Manifeste
                </button>
                <button
                  type="button"
                  onClick={() => handleCharge(boat.id)}
                  disabled={pendingBoatId === boat.id}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow disabled:opacity-50"
                >
                  ⚡ Marquer chargée
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentTarget(boat)}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
                >
                  🛠️ Signaler incident
                </button>
              </div>

              <section className="mt-4 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Historique</h4>
                <ul className="mt-2 space-y-2">
                  {boat.maintenanceLogs.length ? (
                    boat.maintenanceLogs.slice(0, 3).map((entry) => (
                      <li key={entry.id} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-100/50">
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                          <span>{entry.type}</span>
                          <span>{formatDateTime(entry.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-700">{entry.description || '—'}</p>
                        {entry.performedBy ? (
                          <p className="text-[11px] text-slate-400">Par {entry.performedBy}</p>
                        ) : null}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs text-slate-500">Aucune intervention récente.</li>
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Capacité journalière</p>
              <p className="text-base text-slate-600">Choisissez la date et le nombre de barques à affecter (1 à 4).</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                onClick={() => setSelectedQuotaDay(toDateInputValue(new Date()))}
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                onClick={() => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  setSelectedQuotaDay(toDateInputValue(tomorrow))
                }}
              >
                Demain
              </button>
            </div>
          </header>

          <div className="mt-4 grid gap-4 md:grid-cols-[200px,1fr]">
            <label className="text-sm font-semibold text-slate-700">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={selectedQuotaDay}
                onChange={(event) => setSelectedQuotaDay(event.target.value)}
              />
            </label>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Nombre de barques</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((value) => {
                    const isActive = quotaValue === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setQuotaValue(value)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
                          isActive ? 'scale-105 bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {value} barque{value > 1 ? 's' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Note interne (facultative)
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  rows={2}
                  value={quotaNote}
                  onChange={(event) => setQuotaNote(event.target.value)}
                  placeholder="Ex : équipe réduite, prévoir rotation Barque 3..."
                />
              </label>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {quotaIsLoading ? 'Chargement du quota…' : quotaData?.exists ? 'Capacité personnalisée' : 'Capacité standard (4 barques)'}
                {quotaData?.note ? <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Note enregistrée</span> : null}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleQuotaSave}
                  disabled={quotaSubmitting || !selectedQuotaDay}
                  className={`rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                    quotaSubmitting ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow'
                  }`}
                >
                  {quotaSubmitting ? 'Enregistrement…' : 'Appliquer'}
                </button>
                <button
                  type="button"
                  onClick={() => mutateQuota()}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Rafraîchir
                </button>
              </div>
            </div>
          </div>
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

      {editTarget ? (
        <EditBoatModal
          boat={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdateBoat}
          pending={pendingBoatId === editTarget.id}
          canResetManifest={canResetManifest}
          onResetManifest={handleResetManifest}
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
    default: 'bg-white border-slate-200 text-slate-900 border-l-emerald-500',
    warning: 'bg-amber-50 border-amber-200 text-amber-900 border-l-amber-500',
    danger: 'bg-rose-50 border-rose-200 text-rose-900 border-l-rose-500'
  }[tone]
  return (
    <article className={`group rounded-2xl border border-l-4 p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${palette}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold transition-transform group-hover:scale-105">{value}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">Signaler un incident</h2>
          <p className="text-sm text-slate-500">{boat.name}</p>
        </header>
        
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-700">
            Détails
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Rame cassée, fuite, batterie faible..."
              required
            />
          </label>
        </div>
        
        <footer className="flex flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 hover:shadow disabled:opacity-60"
          >
            Valider
          </button>
        </footer>
      </form>
    </div>
  )
}

type EditBoatModalProps = {
  boat: FleetBoat
  pending: boolean
  onClose: () => void
  onSubmit: (
    boatId: number,
    payload: {
      name?: string
      fleetLabel?: string | null
      manifest?: string | null
      lastChargeDate?: string | null
      batteryCycleDays?: number
    }
  ) => Promise<void>
  canResetManifest: boolean
  onResetManifest?: (boatId: number) => Promise<boolean>
}

function EditBoatModal({ boat, pending, onClose, onSubmit, canResetManifest, onResetManifest }: EditBoatModalProps) {
  const toLocalInputValue = (value: string) => {
    try {
      const date = new Date(value)
      const pad = (num: number) => String(num).padStart(2, '0')
      const year = date.getFullYear()
      const month = pad(date.getMonth() + 1)
      const day = pad(date.getDate())
      const hours = pad(date.getHours())
      const minutes = pad(date.getMinutes())
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  const [fleetLabel, setFleetLabel] = useState(boat.fleetLabel ?? boat.name)
  const [manifest, setManifest] = useState(boat.manifest ?? '')
  const [lastChargeValue, setLastChargeValue] = useState(toLocalInputValue(boat.lastChargeDate))
  const [cycleDays, setCycleDays] = useState(boat.batteryCycleDays)
  const [manifestResetting, setManifestResetting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    let lastChargeISO: string | null = null
    if (lastChargeValue) {
      const parsed = new Date(lastChargeValue)
      if (Number.isNaN(parsed.getTime())) {
        alert('Date de charge invalide')
        return
      }
      lastChargeISO = parsed.toISOString()
    }

    await onSubmit(boat.id, {
      fleetLabel: fleetLabel.trim().length ? fleetLabel.trim() : null,
      manifest: manifest.trim().length ? manifest.trim() : null,
      lastChargeDate: lastChargeISO,
      batteryCycleDays: cycleDays
    })
  }

  const handleModalManifestReset = async () => {
    if (!onResetManifest) return
    setManifestResetting(true)
    const success = await onResetManifest(boat.id)
    if (success) {
      setManifest('')
    }
    setManifestResetting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-slate-900">Paramètres de la barque</h2>
          <p className="text-sm text-slate-500">Appliquer un nouveau nom, manifeste ou date de dernière charge.</p>
        </header>

        <div className="space-y-4 p-6">
          <label className="block text-sm font-semibold text-slate-700">
            Nom Fleet & maintenance
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={fleetLabel}
              onChange={(event) => setFleetLabel(event.target.value)}
              placeholder={boat.planningName}
            />
          </label>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Nom planification</p>
            <p className="text-base font-semibold text-slate-900">{boat.planningName}</p>
            <p className="text-xs text-slate-500">Ce libellé reste inchangé dans le planning public.</p>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Manifeste / Notes techniques
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              rows={4}
              value={manifest}
              onChange={(event) => setManifest(event.target.value)}
              placeholder="Consignes spéciales, réparations, équipement..."
            />
            {canResetManifest ? (
              <button
                type="button"
                onClick={handleModalManifestReset}
                disabled={manifestResetting || pending}
                className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-white disabled:opacity-50"
              >
                ♻️ Purger le manifeste
              </button>
            ) : null}
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Dernière charge (manuel)
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={lastChargeValue}
              onChange={(event) => setLastChargeValue(event.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Laisser vide pour conserver la valeur actuelle ({formatDateTime(boat.lastChargeDate)}).
            </p>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Cycle batterie (jours)
            <input
              type="number"
              min={1}
              max={14}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={cycleDays}
              onChange={(event) =>
                setCycleDays(Math.max(1, Math.min(14, Math.round(Number(event.target.value) || 1))))}
            />
            <p className="mt-1 text-xs text-slate-500">Utilisé pour déclencher les alertes J+2 / J+3 / J+4.</p>
          </label>
        </div>

        <footer className="flex flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              setManifest('')
              setLastChargeValue('')
            }}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
          >
            Réinitialiser notes + date
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 hover:shadow disabled:opacity-60"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer' }
          </button>
        </footer>
      </form>
    </div>
  )
}
