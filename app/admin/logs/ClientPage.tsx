'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPageShell } from '../_components/AdminPageShell'

type LogUser = {
  firstName: string | null
  lastName: string | null
  role: string | null
}

type LogEntry = {
  id: string
  action: string
  details: string | null
  createdAt: string
  user: LogUser | null
}

type DetailShape =
  | { type: 'json'; raw: string; preview: string; prettified: string }
  | { type: 'text'; raw: string; preview: string }

const QUICK_RANGES = [
  { key: '24h', label: '24h', days: 1 },
  { key: '7d', label: '7 jours', days: 7 },
  { key: '30d', label: '30 jours', days: 30 }
]

const formatISODate = (value: Date) => value.toISOString().slice(0, 10)

const formatTimestamp = (value: string) => {
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  })
  return formatter.format(new Date(value))
}

const extractActionGroup = (action: string | null | undefined) => {
  if (!action) return 'AUTRE'
  const delimiters = ['::', ' - ', ':', '.', ' ']
  const trimmed = action.trim()
  for (const delimiter of delimiters) {
    if (trimmed.includes(delimiter)) {
      return trimmed.split(delimiter)[0].trim().toUpperCase() || 'AUTRE'
    }
  }
  return trimmed.toUpperCase()
}

const toneForAction = (action: string) => {
  const upper = action.toUpperCase()
  if (upper.includes('DELETE') || upper.includes('CANCEL') || upper.includes('REMOVE')) {
    return 'border border-rose-200 bg-rose-50 text-rose-700'
  }
  if (upper.includes('CREATE') || upper.includes('ADD') || upper.includes('NEW') || upper.includes('BOOK')) {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('PATCH')) {
    return 'border border-amber-200 bg-amber-50 text-amber-700'
  }
  return 'border border-blue-200 bg-blue-50 text-blue-700'
}

const parseDetails = (raw: string | null): DetailShape => {
  if (!raw) {
    return { type: 'text', raw: '', preview: '—' }
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return { type: 'text', raw: '', preview: '—' }
  }

  try {
    const parsed = JSON.parse(trimmed)
    const prettified = JSON.stringify(parsed, null, 2)
    const preview = (() => {
      if (Array.isArray(parsed)) {
        if (!parsed.length) return 'Tableau vide'
        if (typeof parsed[0] === 'object') {
          const keys = Object.keys(parsed[0])
          return `Tableau (${parsed.length}) • ${keys.slice(0, 3).join(', ')}`
        }
        return `Tableau (${parsed.length})`
      }
      if (typeof parsed === 'object') {
        const entries = Object.entries(parsed)
        if (!entries.length) return 'Objet vide'
        return entries
          .slice(0, 3)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join(' • ')
      }
      return String(parsed)
    })()
    return { type: 'json', raw: trimmed, preview, prettified }
  } catch (error) {
    const preview = trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed
    return { type: 'text', raw: trimmed, preview }
  }
}

export default function ClientLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionQuery, setActionQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [detailsQuery, setDetailsQuery] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [quickRange, setQuickRange] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [copiedLog, setCopiedLog] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/logs', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`Erreur API ${response.status}`)
      }
      const payload = (await response.json()) as LogEntry[]
      setLogs(payload)
    } catch (fetchError) {
      console.error('Erreur chargement logs', fetchError)
      setError('Impossible de récupérer les logs. Réessayez.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const availableGroups = useMemo(() => {
    const groups = new Set<string>()
    logs.forEach((log) => {
      const group = extractActionGroup(log.action)
      if (group) {
        groups.add(group)
      }
    })
    return Array.from(groups).sort()
  }, [logs])

  const startDate = useMemo(() => {
    if (!dateStart) return null
    const value = new Date(dateStart)
    value.setHours(0, 0, 0, 0)
    return value
  }, [dateStart])

  const endDate = useMemo(() => {
    if (!dateEnd) return null
    const value = new Date(dateEnd)
    value.setHours(23, 59, 59, 999)
    return value
  }, [dateEnd])

  const filteredLogs = useMemo(() => {
    const normalizedAction = actionQuery.trim().toLowerCase()
    const normalizedUser = userQuery.trim().toLowerCase()
    const normalizedDetails = detailsQuery.trim().toLowerCase()

    return logs.filter((log) => {
      const actionGroup = extractActionGroup(log.action)
      if (selectedGroup && actionGroup !== selectedGroup) {
        return false
      }

      if (normalizedAction && !log.action.toLowerCase().includes(normalizedAction)) {
        return false
      }

      const fullName = `${log.user?.firstName ?? ''} ${log.user?.lastName ?? ''}`.trim().toLowerCase()
      if (normalizedUser && !fullName.includes(normalizedUser)) {
        return false
      }

      if (normalizedDetails) {
        const target = log.details?.toLowerCase() ?? ''
        if (!target.includes(normalizedDetails)) {
          return false
        }
      }

      const created = new Date(log.createdAt)
      if (startDate && created < startDate) {
        return false
      }
      if (endDate && created > endDate) {
        return false
      }

      return true
    })
  }, [logs, selectedGroup, actionQuery, userQuery, detailsQuery, startDate, endDate])

  const stats = useMemo(() => {
    const actors = new Set<string>()
    filteredLogs.forEach((log) => {
      const name = `${log.user?.firstName ?? ''} ${log.user?.lastName ?? ''}`.trim()
      if (name) {
        actors.add(name)
      }
    })
    return {
      total: logs.length,
      filtered: filteredLogs.length,
      actors: actors.size
    }
  }, [filteredLogs, logs])

  const handleQuickRange = (key: string) => {
    if (!key) {
      setQuickRange('')
      setDateStart('')
      setDateEnd('')
      return
    }

    const preset = QUICK_RANGES.find((item) => item.key === key)
    if (!preset) return

    const now = new Date()
    const start = new Date()
    start.setDate(now.getDate() - (preset.days - 1))

    setQuickRange(key)
    setDateStart(formatISODate(start))
    setDateEnd(formatISODate(now))
  }

  const toggleExpanded = (id: string) => {
    setExpandedLog((current) => (current === id ? null : id))
  }

  const handleCopyDetails = async (id: string, raw: string) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard API non disponible')
      return
    }

    try {
      await navigator.clipboard.writeText(raw)
      setCopiedLog(id)
      window.setTimeout(() => setCopiedLog((current) => (current === id ? null : current)), 2000)
    } catch (clipboardError) {
      console.error('Impossible de copier', clipboardError)
    }
  }

  const resetFilters = () => {
    setActionQuery('')
    setSelectedGroup('')
    setUserQuery('')
    setDetailsQuery('')
    setDateStart('')
    setDateEnd('')
    setQuickRange('')
  }

  return (
    <AdminPageShell
      title="Journal d'activité"
      description="Analysez les 100 derniers événements critiques générés par la plateforme."
      actions={
        <button
          type="button"
          onClick={fetchLogs}
          className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Actualiser
        </button>
      }
    >
      <div className="space-y-6">
        <section className="sn-card border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-500">
                {stats.filtered} événement{stats.filtered > 1 ? 's' : ''} filtré{stats.filtered > 1 ? 's' : ''} / {stats.total}{' '}
                total, {stats.actors} acteur{stats.actors > 1 ? 's' : ''} impliqué{stats.actors > 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-slate-50"
              >
                Réinitialiser
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recherche action</span>
                <input
                  value={actionQuery}
                  onChange={(event) => setActionQuery(event.target.value)}
                  placeholder="ex: BOOKING_DELETE"
                  className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filtrer par acteur</span>
                <input
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Nom ou prénom"
                  className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contenu des détails</span>
                <input
                  value={detailsQuery}
                  onChange={(event) => setDetailsQuery(event.target.value)}
                  placeholder="email, référence..."
                  className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                />
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Famille d'actions</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup('')}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      selectedGroup === ''
                        ? 'border-blue-500 bg-blue-50 text-blue-600 shadow'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    Toutes
                  </button>
                  {availableGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setSelectedGroup((current) => (current === group ? '' : group))}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        selectedGroup === group
                          ? 'border-blue-500 bg-blue-50 text-blue-600 shadow'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date début</span>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(event) => {
                      setDateStart(event.target.value)
                      setQuickRange('')
                    }}
                    className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date fin</span>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(event) => {
                      setDateEnd(event.target.value)
                      setQuickRange('')
                    }}
                    className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Raccourcis</span>
                {QUICK_RANGES.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleQuickRange(preset.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      quickRange === preset.key
                        ? 'border-blue-500 bg-blue-50 text-blue-600 shadow'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickRange('')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    quickRange === '' && dateStart === '' && dateEnd === ''
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  Tout voir
                </button>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="sn-card overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-52 px-4 py-3">Date & heure</th>
                  <th className="w-48 px-4 py-3">Utilisateur</th>
                  <th className="w-48 px-4 py-3">Action</th>
                  <th className="px-4 py-3">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      Chargement des activités…
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      Aucun résultat avec les filtres actuels.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const detail = parseDetails(log.details)
                    const isExpanded = expandedLog === log.id
                    const fullName = `${log.user?.firstName ?? 'Inconnu'} ${log.user?.lastName ?? ''}`.trim()
                    const actionTone = toneForAction(log.action)

                    return (
                      <Fragment key={log.id}>
                        <tr className="transition hover:bg-slate-50">
                          <td className="px-4 py-4 align-top font-mono text-xs text-slate-500">{formatTimestamp(log.createdAt)}</td>
                          <td className="px-4 py-4 align-top">
                            <div className="font-semibold text-slate-800">{fullName || '—'}</div>
                            {log.user?.role && (
                              <span className="mt-1 inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                {log.user.role}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span className={`inline-flex max-w-full items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${actionTone}`}>
                              {log.action}
                            </span>
                            <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
                              {extractActionGroup(log.action)}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-2 text-xs text-slate-600">
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {detail.preview}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(log.id)}
                                  className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                  {isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                                </button>
                                {detail.raw && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyDetails(log.id, detail.raw)}
                                    className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                  >
                                    {copiedLog === log.id ? 'Copié !' : 'Copier' }
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={4} className="px-4 pb-6 pt-2">
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                {detail.type === 'json' ? (
                                  <pre className="max-h-64 overflow-auto rounded bg-slate-900 p-4 text-xs text-slate-100">
                                    {detail.prettified}
                                  </pre>
                                ) : (
                                  <p className="whitespace-pre-wrap break-words text-sm text-slate-600">
                                    {detail.raw}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminPageShell>
  )
}
