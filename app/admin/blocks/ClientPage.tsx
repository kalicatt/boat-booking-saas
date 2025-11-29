'use client'

import { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AdminPageShell } from '../_components/AdminPageShell'

type Scope = 'day' | 'morning' | 'afternoon' | 'specific'

interface BlockedInterval {
  id: string
  start: string
  end: string
  scope: Scope
  reason?: string | null
}

type SingleFormState = {
  date: string
  startTime: string
  endTime: string
  scope: Scope
  reason: string
}

type RecurringFormState = {
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  reason: string
}

const PRESETS: Array<{ key: Scope; label: string; start: string; end: string }> = [
  { key: 'day', label: 'Journée complète', start: '00:00', end: '23:59' },
  { key: 'morning', label: 'Matinée (10h-12h)', start: '10:00', end: '12:00' },
  { key: 'afternoon', label: 'Après-midi (13h30-18h)', start: '13:30', end: '18:00' }
]

const buildUtcDate = (date: string, time: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  if ([y, m, d, hh, mm].some((v) => Number.isNaN(v))) return null
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0))
}

const dateInputFromIso = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const timeInputFromIso = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(11, 16)
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return format(d, "EEEE dd MMMM yyyy '·' HH'h'mm", { locale: fr })
}

export default function ClientBlocksAdminPage() {
  const today = new Date().toISOString().slice(0, 10)

  const [blocks, setBlocks] = useState<BlockedInterval[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'single' | 'recurring'>('single')
  const [singleForm, setSingleForm] = useState<SingleFormState>({
    date: today,
    startTime: '10:00',
    endTime: '12:00',
    scope: 'specific',
    reason: ''
  })
  const [recurringForm, setRecurringForm] = useState<RecurringFormState>({
    startDate: today,
    endDate: today,
    startTime: '10:00',
    endTime: '12:00',
    reason: ''
  })
  const [editingBlock, setEditingBlock] = useState<BlockedInterval | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecurringSubmitting, setIsRecurringSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/blocks')
        if (!res.ok) throw new Error('Erreur chargement blocages')
        const data = await res.json()
        setBlocks(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error(error)
        setFeedback({ kind: 'error', message: 'Impossible de récupérer les blocages.' })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!feedback) return
    const id = window.setTimeout(() => setFeedback(null), 3500)
    return () => window.clearTimeout(id)
  }, [feedback])

  const reloadBlocks = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/blocks')
      if (!res.ok) throw new Error('Erreur chargement blocages')
      const data = await res.json()
      setBlocks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setFeedback({ kind: 'error', message: 'Erreur lors de la mise à jour de la liste.' })
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    const now = new Date()
    const upcoming = blocks.filter((b) => new Date(b.end) >= now)
    const archived = blocks.length - upcoming.length
    const within7 = upcoming.filter((b) => {
      const diff = differenceInCalendarDays(new Date(b.start), now)
      return diff >= 0 && diff <= 7
    }).length
    return {
      total: blocks.length,
      upcoming: upcoming.length,
      archived,
      weekly: within7
    }
  }, [blocks])

  const upcomingBlocks = useMemo(() => {
    const now = new Date()
    return [...blocks]
      .filter((b) => new Date(b.end) >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [blocks])

  const archivedBlocks = useMemo(() => {
    const now = new Date()
    return [...blocks]
      .filter((b) => new Date(b.end) < now)
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .slice(0, 20)
  }, [blocks])

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    setSingleForm((prev) => ({
      ...prev,
      scope: preset.key,
      startTime: preset.start,
      endTime: preset.end
    }))
  }

  const resetSingleForm = () => {
    setSingleForm({ date: today, startTime: '10:00', endTime: '12:00', scope: 'specific', reason: '' })
    setEditingBlock(null)
  }

  const handleSubmitSingle = async () => {
    if (!singleForm.date || !singleForm.startTime || !singleForm.endTime) {
      setFeedback({ kind: 'error', message: 'Veuillez renseigner la date et les horaires.' })
      return
    }

    const startDate = buildUtcDate(singleForm.date, singleForm.startTime)
    const endDate = buildUtcDate(singleForm.date, singleForm.endTime)

    if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
      setFeedback({ kind: 'error', message: "L'horaire de fin doit être postérieur au début." })
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        start: startDate.toISOString().slice(0, 16),
        end: endDate.toISOString().slice(0, 16),
        scope: singleForm.scope,
        reason: singleForm.reason.trim() ? singleForm.reason.trim() : undefined,
        repeat: 'none' as const
      }

      const res = await fetch('/api/admin/blocks', {
        method: editingBlock ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingBlock ? { ...payload, id: editingBlock.id } : payload
        )
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Erreur lors de la sauvegarde du blocage')
      }

      setFeedback({ kind: 'success', message: editingBlock ? 'Blocage mis à jour.' : 'Blocage créé.' })
      await reloadBlocks()
      resetSingleForm()
    } catch (error) {
      console.error(error)
      setFeedback({ kind: 'error', message: (error as Error).message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitRecurring = async () => {
    if (!recurringForm.startDate || !recurringForm.endDate) {
      setFeedback({ kind: 'error', message: 'Sélectionnez une période valide.' })
      return
    }

    const startDate = buildUtcDate(recurringForm.startDate, recurringForm.startTime)
    const endDate = buildUtcDate(recurringForm.startDate, recurringForm.endTime)
    if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
      setFeedback({ kind: 'error', message: "L'horaire de fin doit être postérieur au début." })
      return
    }

    const rangeDelta = differenceInCalendarDays(
      new Date(`${recurringForm.endDate}T00:00:00Z`),
      new Date(`${recurringForm.startDate}T00:00:00Z`)
    )
    if (rangeDelta < 0) {
      setFeedback({ kind: 'error', message: 'La date de fin doit être après la date de début.' })
      return
    }
    if (rangeDelta > 366) {
      setFeedback({ kind: 'error', message: 'La période est trop longue (maximum 12 mois).' })
      return
    }

    try {
      setIsRecurringSubmitting(true)
      const payload = {
        start: startDate.toISOString().slice(0, 16),
        end: endDate.toISOString().slice(0, 16),
        scope: 'specific' as const,
        reason: recurringForm.reason.trim() ? recurringForm.reason.trim() : undefined,
        repeat: 'daily' as const,
        repeatUntil: recurringForm.endDate
      }

      const res = await fetch('/api/admin/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Erreur lors de la création des blocages récurrents')
      }

      setFeedback({ kind: 'success', message: 'Blocages récurrents enregistrés.' })
      await reloadBlocks()
      setRecurringForm((prev) => ({ ...prev, reason: '' }))
    } catch (error) {
      console.error(error)
      setFeedback({ kind: 'error', message: (error as Error).message })
    } finally {
      setIsRecurringSubmitting(false)
    }
  }

  const handleDelete = async (block: BlockedInterval) => {
    const confirmed = window.confirm('Supprimer ce blocage ?')
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/blocks?id=${block.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Suppression impossible')
      setFeedback({ kind: 'success', message: 'Blocage supprimé.' })
      if (editingBlock?.id === block.id) resetSingleForm()
      await reloadBlocks()
    } catch (error) {
      console.error(error)
      setFeedback({ kind: 'error', message: 'Erreur lors de la suppression.' })
    }
  }

  const beginEdit = (block: BlockedInterval) => {
    setMode('single')
    setEditingBlock(block)
    setSingleForm({
      date: dateInputFromIso(block.start),
      startTime: timeInputFromIso(block.start),
      endTime: timeInputFromIso(block.end),
      scope: block.scope,
      reason: block.reason || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AdminPageShell
      title="Blocages de réservation"
      description="Planifiez des indisponibilités ponctuelles ou récurrentes pour optimiser l'ouverture des créneaux."
      actions={
        <button
          type="button"
          onClick={reloadBlocks}
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          Rafraîchir
        </button>
      }
    >
      {feedback && (
        <div
          className={`fixed right-4 top-4 z-40 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg ${
            feedback.kind === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocages actifs</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.upcoming}</p>
            <p className="text-xs text-slate-500">Inclut les blocages à venir ou en cours.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dans les 7 prochains jours</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.weekly}</p>
            <p className="text-xs text-slate-500">Pour anticiper les indisponibilités immédiates.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Historique</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.archived}</p>
            <p className="text-xs text-slate-500">Blocages passés (20 derniers affichés).</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total enregistré</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.total}</p>
            <p className="text-xs text-slate-500">Toutes périodes confondues.</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingBlock ? 'Modifier le blocage' : 'Créer un blocage'}
                </h2>
                {editingBlock && (
                  <button
                    type="button"
                    onClick={resetSingleForm}
                    className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                  >
                    Annuler la modification
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 rounded-lg bg-slate-50 p-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`rounded px-3 py-1 ${
                    mode === 'single' ? 'bg-white text-blue-600 shadow' : 'hover:bg-white/70'
                  }`}
                >
                  Blocage ponctuel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBlock(null)
                    setMode('recurring')
                  }}
                  className={`rounded px-3 py-1 ${
                    mode === 'recurring' ? 'bg-white text-blue-600 shadow' : 'hover:bg-white/70'
                  }`}
                >
                  Blocage récurrent
                </button>
              </div>

              {mode === 'single' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date (Europe/Paris)
                    </label>
                    <input
                      type="date"
                      value={singleForm.date}
                      onChange={(event) =>
                        setSingleForm((prev) => ({ ...prev, date: event.target.value }))
                      }
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Début
                      </label>
                      <input
                        type="time"
                        value={singleForm.startTime}
                        onChange={(event) =>
                          setSingleForm((prev) => ({
                            ...prev,
                            startTime: event.target.value,
                            scope: 'specific'
                          }))
                        }
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Fin
                      </label>
                      <input
                        type="time"
                        value={singleForm.endTime}
                        onChange={(event) =>
                          setSingleForm((prev) => ({
                            ...prev,
                            endTime: event.target.value,
                            scope: 'specific'
                          }))
                        }
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Raccourcis
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => handlePreset(preset)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            singleForm.scope === preset.key
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Raison (optionnel)
                    </label>
                    <input
                      value={singleForm.reason}
                      onChange={(event) =>
                        setSingleForm((prev) => ({ ...prev, reason: event.target.value }))
                      }
                      placeholder="Maintenance, évènement privé, etc."
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitSingle}
                    disabled={isSubmitting}
                    className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {editingBlock ? 'Enregistrer les modifications' : 'Créer le blocage'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Début de période
                      </label>
                      <input
                        type="date"
                        value={recurringForm.startDate}
                        onChange={(event) =>
                          setRecurringForm((prev) => ({ ...prev, startDate: event.target.value }))
                        }
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Fin de période
                      </label>
                      <input
                        type="date"
                        value={recurringForm.endDate}
                        onChange={(event) =>
                          setRecurringForm((prev) => ({ ...prev, endDate: event.target.value }))
                        }
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Horaire début
                      </label>
                      <input
                        type="time"
                        value={recurringForm.startTime}
                        onChange={(event) =>
                          setRecurringForm((prev) => ({ ...prev, startTime: event.target.value }))
                        }
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Horaire fin
                      </label>
                      <input
                        type="time"
                        value={recurringForm.endTime}
                        onChange={(event) =>
                          setRecurringForm((prev) => ({ ...prev, endTime: event.target.value }))
                        }
                        className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Raison (optionnel)
                    </label>
                    <input
                      value={recurringForm.reason}
                      onChange={(event) =>
                        setRecurringForm((prev) => ({ ...prev, reason: event.target.value }))
                      }
                      placeholder="Maintenance hebdomadaire, privatisation, etc."
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitRecurring}
                    disabled={isRecurringSubmitting}
                    className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    Créer les blocages quotidiens
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-lg font-semibold text-slate-900">Blocages à venir</h3>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {upcomingBlocks.length} programmés
                </span>
              </div>
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-500">Chargement...</div>
              ) : upcomingBlocks.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Aucun blocage à venir. Programmez vos indisponibilités pour éviter les prises en ligne.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcomingBlocks.map((block) => (
                    <li key={block.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{formatDateTime(block.start)}</p>
                        <p className="text-xs text-slate-500">
                          Jusqu'à {format(new Date(block.end), "HH'h'mm", { locale: fr })}
                        </p>
                        {block.reason && (
                          <p className="mt-1 text-xs text-slate-600">{block.reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {block.scope}
                        </span>
                        <button
                          type="button"
                          onClick={() => beginEdit(block)}
                          className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(block)}
                          className="rounded border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-lg font-semibold text-slate-900">Historique récent</h3>
                <span className="text-xs text-slate-400">20 derniers</span>
              </div>
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-500">Chargement...</div>
              ) : archivedBlocks.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Aucun blocage passé pour l'instant.</div>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {archivedBlocks.map((block) => (
                    <li key={block.id} className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{formatDateTime(block.start)}</p>
                        <p className="text-xs text-slate-500">
                          Terminé le {format(new Date(block.end), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                        {block.reason && <p className="text-xs text-slate-500">{block.reason}</p>}
                      </div>
                      <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {block.scope}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminPageShell>
  )
}
