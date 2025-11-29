"use client"
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { business } from '@/lib/business'
import { AdminPageShell } from '../_components/AdminPageShell'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const BILL_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5] as const
const COIN_DENOMINATIONS = [2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01] as const

type BreakdownState = {
  bills: Record<string, number>
  coins: Record<string, number>
}

const createEmptyBreakdown = (): BreakdownState => ({
  bills: BILL_DENOMINATIONS.reduce((acc, value) => {
    acc[String(value)] = 0
    return acc
  }, {} as Record<string, number>),
  coins: COIN_DENOMINATIONS.reduce((acc, value) => {
    acc[String(value)] = 0
    return acc
  }, {} as Record<string, number>)
})

const toArray = (value: any) =>
  Array.isArray(value)
    ? value
    : Array.isArray(value?.items)
    ? value.items
    : Array.isArray(value?.closures)
    ? value.closures
    : Array.isArray(value?.data)
    ? value.data
    : []

const isForbidden = (value: any) =>
  !!value && !Array.isArray(value) && (value.status === 403 || value.code === 403 || value?.error === 'Forbidden')

const centsToEuro = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return (value / 100).toFixed(2) + ' €'
}

const computeExpectedCents = (session: any) => {
  if (!session) return 0
  const opening = session.openingFloat || 0
  const movementsTotal = (session.movements || []).reduce((sum: number, movement: any) => {
    const amount = Number(movement?.amount || 0)
    return sum + amount
  }, 0)
  return opening + movementsTotal
}

const computeBreakdownCents = (breakdown: BreakdownState) => {
  const sumGroup = (entries: [string, number][]) =>
    entries.reduce((sum, [value, count]) => {
      const numericValue = parseFloat(value)
      if (!Number.isFinite(numericValue) || !Number.isFinite(count)) return sum
      return sum + Math.round(numericValue * 100) * Math.max(0, count)
    }, 0)

  return sumGroup(Object.entries(breakdown.bills)) + sumGroup(Object.entries(breakdown.coins))
}

const triggerCsvDownload = (rows: string[][], filename: string) => {
  if (!rows.length) return
  const csvContent = rows
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const parseBreakdownPayload = (payload: any) => {
  if (!payload) return null
  try {
    return typeof payload === 'string' ? JSON.parse(payload) : payload
  } catch {
    return null
  }
}

export default function AccountingAdminPage() {
  const { data: ledger, mutate: mutateLedger } = useSWR('/api/admin/ledger', fetcher)
  const { data: cash, mutate: mutateCash } = useSWR('/api/admin/cash', fetcher)
  const { data: closures, mutate: mutateClosures } = useSWR('/api/admin/closures', fetcher)

  const ledgerList = useMemo(() => toArray(ledger), [ledger])
  const cashSessions = useMemo(() => toArray(cash), [cash])
  const closuresList = useMemo(() => toArray(closures), [closures])

  const [openingFloatEuros, setOpeningFloatEuros] = useState('')
  const [closingCountEuros, setClosingCountEuros] = useState('')
  const [selectedDay, setSelectedDay] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [exportPeriod, setExportPeriod] = useState<'week' | 'month'>('month')
  const [exportAnchor, setExportAnchor] = useState<string>(() => new Date().toISOString().slice(0, 7))
  const [showClosingModal, setShowClosingModal] = useState(false)
  const [closingBreakdown, setClosingBreakdown] = useState<BreakdownState>(() => createEmptyBreakdown())
  const [closingNotes, setClosingNotes] = useState('')
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [isOpening, setIsOpening] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isQuickExporting, setIsQuickExporting] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timeout)
  }, [toast])

  const declaredClosingCents = useMemo(() => {
    const parsed = parseFloat(closingCountEuros || '0')
    if (!Number.isFinite(parsed)) return 0
    return Math.round(parsed * 100)
  }, [closingCountEuros])

  const openSession = cashSessions.find((session: any) => !session.closedAt)
  const lastClosedSession = cashSessions.find((session: any) => session.closedAt)
  const latestSession = openSession || lastClosedSession || cashSessions[0]
  const expectedForOpen = computeExpectedCents(openSession)

  const refreshAll = () => {
    mutateLedger()
    mutateCash()
    mutateClosures()
  }

  const handleOpenCash = async () => {
    if (!window.confirm("Confirmer l'ouverture de la caisse ?")) return
    const cents = Math.round(Number.parseFloat(openingFloatEuros || '0') * 100)
    if (Number.isNaN(cents)) {
      setToast({ type: 'error', message: 'Montant invalide.' })
      return
    }
    try {
      setIsOpening(true)
      const response = await fetch('/api/admin/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', openingFloat: cents })
      })
      if (!response.ok) throw new Error('Open cash failed')
      setOpeningFloatEuros('')
      setToast({ type: 'success', message: 'Caisse ouverte avec succès.' })
      await mutateCash()
      await mutateLedger()
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: "Impossible d'ouvrir la caisse." })
    } finally {
      setIsOpening(false)
    }
  }

  const handlePrepareClosing = () => {
    if (!openSession) {
      setToast({ type: 'error', message: 'Aucune session de caisse ouverte.' })
      return
    }
    setClosingBreakdown(createEmptyBreakdown())
    setClosingNotes('')
    setShowClosingModal(true)
  }

  const handleSubmitClosing = async () => {
    if (!openSession) {
      setToast({ type: 'error', message: 'Aucune session ouverte détectée.' })
      return
    }
    const computedCents = computeBreakdownCents(closingBreakdown)
    if (computedCents <= 0) {
      setToast({ type: 'error', message: 'Le comptage doit être supérieur à zéro.' })
      return
    }

    try {
      setIsClosing(true)
      const expectedCents = computeExpectedCents(openSession)
      const payloadBreakdown = {
        bills: closingBreakdown.bills,
        coins: closingBreakdown.coins,
        notes: closingNotes || undefined,
        declaredAmountCents: declaredClosingCents,
        computedAmountCents: computedCents,
        expectedAmountCents: expectedCents,
        varianceCents: computedCents - expectedCents,
        createdAt: new Date().toISOString()
      }

      const response = await fetch('/api/admin/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          sessionId: openSession.id,
          closingCount: computedCents,
          closingBreakdown: payloadBreakdown
        })
      })

      if (!response.ok) throw new Error('Close cash failed')

      setToast({ type: 'success', message: 'Caisse clôturée avec succès.' })
      setClosingCountEuros('')
      setShowClosingModal(false)
      await mutateCash()
      await mutateLedger()
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Erreur lors de la clôture de la caisse.' })
    } finally {
      setIsClosing(false)
    }
  }

  const handleQuickExport = () => {
    if (!latestSession) {
      setToast({ type: 'error', message: 'Aucune session disponible pour exporter.' })
      return
    }
    setIsQuickExporting(true)
    try {
      const expected = computeExpectedCents(latestSession)
      const counted = typeof latestSession.closingCount === 'number' ? latestSession.closingCount : null
      const variance = counted !== null ? counted - expected : null
      const breakdown = parseBreakdownPayload(latestSession.closingBreakdown) || {}
      const rows: string[][] = [
        ['Entreprise', business.name],
        ['Adresse', business.address],
        ['Téléphone', business.phone],
        ['SIRET', business.siret],
        [],
        ['Session ID', latestSession.id],
        ['Ouverte', format(new Date(latestSession.openedAt), 'yyyy-MM-dd HH:mm')],
        ['Fermée', latestSession.closedAt ? format(new Date(latestSession.closedAt), 'yyyy-MM-dd HH:mm') : 'Non clôturée'],
        ['Fond de caisse', centsToEuro(latestSession.openingFloat)],
        ['Attendu', centsToEuro(expected)],
        ['Compté', centsToEuro(counted ?? null)],
        ['Écart', centsToEuro(variance)],
        []
      ]

      rows.push(['Décomposition billets'])
      rows.push(['Valeur', 'Quantité', 'Montant'])
      BILL_DENOMINATIONS.forEach((value) => {
        const count = Number(breakdown?.bills?.[String(value)] ?? 0)
        rows.push([`${value} €`, String(count), (value * count).toFixed(2) + ' €'])
      })

      rows.push([])
      rows.push(['Décomposition pièces'])
      rows.push(['Valeur', 'Quantité', 'Montant'])
      COIN_DENOMINATIONS.forEach((value) => {
        const count = Number(breakdown?.coins?.[String(value)] ?? 0)
        rows.push([`${value.toFixed(2)} €`, String(count), (value * count).toFixed(2) + ' €'])
      })

      if (breakdown?.notes) {
        rows.push([])
        rows.push(['Notes', String(breakdown.notes)])
      }

      rows.push([])
      rows.push(['Exporté le', format(new Date(), 'yyyy-MM-dd HH:mm:ss')])

      const filename = `cash_session_${format(new Date(latestSession.openedAt), 'yyyyMMdd_HHmm')}.csv`
      triggerCsvDownload(rows, filename)
      setToast({ type: 'success', message: 'Export CSV généré.' })
    } finally {
      setIsQuickExporting(false)
    }
  }

  return (
    <AdminPageShell
      title="Comptabilité"
      description="Suivez la caisse, le journal comptable et conservez facilement vos preuves papier."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={handleQuickExport}
            disabled={isQuickExporting}
            className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export rapide CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Imprimer la page
          </button>
        </div>
      }
    >
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <div className="sn-card space-y-6">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Gestion de caisse</h2>
                  <p className="text-sm text-slate-500">
                    Ouvrez ou clôturez la caisse, puis archivez les écarts avec un détail par billet et pièce.
                  </p>
                </div>
                {openSession ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    Session ouverte
                  </span>
                ) : lastClosedSession ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Dernière clôture {format(new Date(lastClosedSession.closedAt), 'dd/MM HH:mm')}
                  </span>
                ) : null}
              </header>

              <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendu</span>
                  <span className="text-lg font-bold text-slate-900">{centsToEuro(expectedForOpen)}</span>
                  <span className="text-xs text-slate-500">
                    Calculé à partir du fond de caisse et des mouvements enregistrés.
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border bg-white p-3 shadow-sm">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fond de caisse
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={openingFloatEuros}
                      onChange={(event) => setOpeningFloatEuros(event.target.value)}
                      placeholder="Ex : 150.00"
                      className="mt-2 w-full rounded border border-slate-200 px-2 py-1.5 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleOpenCash}
                      disabled={isOpening}
                      className="mt-3 w-full rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      Ouvrir la caisse
                    </button>
                  </div>

                  <div className="rounded border bg-white p-3 shadow-sm">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Comptage (indicatif)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={closingCountEuros}
                      onChange={(event) => setClosingCountEuros(event.target.value)}
                      placeholder="Ex : 198.50"
                      className="mt-2 w-full rounded border border-slate-200 px-2 py-1.5 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handlePrepareClosing}
                      disabled={isClosing || !openSession}
                      className="mt-3 w-full rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      Décomposer et clôturer
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Historique des sessions</h3>
                <div className="space-y-3">
                  {cashSessions.length === 0 && (
                    <div className="rounded border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      Aucun historique pour le moment. Ouvrez la caisse pour démarrer un suivi.
                    </div>
                  )}
                  {cashSessions.map((session: any) => {
                    const expected = computeExpectedCents(session)
                    const counted = typeof session.closingCount === 'number' ? session.closingCount : null
                    const variance = counted !== null ? counted - expected : null
                    const breakdown = parseBreakdownPayload(session.closingBreakdown)
                    const badgeClass = variance === null || variance === 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : Math.abs(variance) <= 200
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'

                    return (
                      <div key={session.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {format(new Date(session.openedAt), 'dd/MM HH:mm')} · Float {centsToEuro(session.openingFloat)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {session.closedAt
                                ? `Fermée le ${format(new Date(session.closedAt), 'dd/MM HH:mm')} · Compté ${centsToEuro(counted)}`
                                : 'Session en cours'}
                            </p>
                            <p className="text-xs text-slate-500">
                              Attendu {centsToEuro(expected)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {variance !== null && (
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                                Écart {centsToEuro(variance)}
                              </span>
                            )}
                            {breakdown && (
                              <button
                                type="button"
                                onClick={() => setSelectedSession(session)}
                                className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                Voir détails
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="sn-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Journal Ledger (200 derniers)</h2>
                <p className="text-sm text-slate-500">Toutes les opérations enregistrées sur les différents moyens de paiement.</p>
              </div>
              <a
                href="/admin/accounting/reconciliation"
                className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600 shadow-sm transition hover:bg-blue-50"
              >
                Aller au rapprochement
              </a>
            </div>
            {isForbidden(ledger) ? (
              <div className="p-4 text-sm text-rose-600">Accès refusé (403). Connectez-vous avec un compte administrateur.</div>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white shadow">
                    <tr className="text-left">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">#Reçu</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Provider</th>
                      <th className="px-3 py-2">Méthode</th>
                      <th className="px-3 py-2 text-right">Montant</th>
                      <th className="px-3 py-2">Booking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerList.map((entry: any) => (
                      <tr key={entry.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{format(new Date(entry.occurredAt), 'dd/MM HH:mm')}</td>
                        <td className="px-3 py-2">
                          {entry.receiptNo
                            ? `${new Date(entry.occurredAt).getUTCFullYear()}-${String(entry.receiptNo).padStart(6, '0')}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2">{entry.eventType}</td>
                        <td className="px-3 py-2">{entry.provider}</td>
                        <td className="px-3 py-2">{entry.methodType || '—'}</td>
                        <td className="px-3 py-2 text-right">{(entry.amount / 100).toFixed(2)} {entry.currency}</td>
                        <td className="px-3 py-2">{entry.bookingId || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="sn-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Clôtures journalières (Z)</h2>
                <p className="text-sm text-slate-500">Générez des snapshots verrouillés pour archiver vos journées.</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Imprimer cette section
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <input
                type="date"
                value={selectedDay}
                onChange={(event) => setSelectedDay(event.target.value)}
                className="rounded border border-slate-200 px-2 py-1.5 shadow-inner focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`Clôturer la journée du ${selectedDay} ?`)) return
                  try {
                    const day = new Date(`${selectedDay}T00:00:00Z`)
                    day.setUTCHours(0, 0, 0, 0)
                    const response = await fetch('/api/admin/closures', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ day })
                    })
                    if (!response.ok) throw new Error('Closure failed')
                    setToast({ type: 'success', message: 'Clôture journalière enregistrée.' })
                    await mutateClosures()
                    await mutateLedger()
                  } catch (error) {
                    console.error(error)
                    setToast({ type: 'error', message: 'Erreur lors de la clôture journalière.' })
                  }
                }}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-blue-700"
              >
                Clôturer la journée
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!closuresList.length) {
                    setToast({ type: 'error', message: 'Aucune clôture à exporter.' })
                    return
                  }
                  const target =
                    closuresList.find((closure: any) => new Date(closure.day).toISOString().slice(0, 10) === selectedDay) ||
                    closuresList[0]
                  const snapshot = JSON.parse(target.totalsJson)
                  const rows: string[][] = [
                    ['Entreprise', business.name],
                    ['Date', format(new Date(target.day), 'yyyy-MM-dd')],
                    ['Hash', target.hash],
                    [],
                    ['Totaux', ...Object.entries(snapshot.totals).map(([k, v]: any) => `${k}: ${(Number(v) / 100).toFixed(2)} €`)],
                    ['Vouchers', ...Object.entries(snapshot.vouchers).map(([k, v]: any) => `${k}: ${Number(v)}`)],
                    [
                      'TVA',
                      `Net: ${(Number(snapshot.vat?.net || 0) / 100).toFixed(2)} €`,
                      `TVA: ${(Number(snapshot.vat?.vat || 0) / 100).toFixed(2)} €`,
                      `Brut: ${(Number(snapshot.vat?.gross || 0) / 100).toFixed(2)} €`
                    ]
                  ]
                  triggerCsvDownload(rows, `closure_${format(new Date(target.day), 'yyyy-MM-dd')}.csv`)
                  setToast({ type: 'success', message: 'Clôture exportée en CSV.' })
                }}
                className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Exporter CSV
              </button>
            </div>

            <div className="max-h-72 overflow-auto rounded border border-dashed border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Hash</th>
                    <th className="px-3 py-2 text-left">Totaux</th>
                  </tr>
                </thead>
                <tbody>
                  {closuresList.map((closure: any) => {
                    const snapshot = JSON.parse(closure.totalsJson)
                    return (
                      <tr
                        key={closure.id}
                        className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          const dayStr = format(new Date(closure.day), 'yyyy-MM-dd')
                          window.location.href = `/admin/accounting/${dayStr}`
                        }}
                      >
                        <td className="px-3 py-2">{format(new Date(closure.day), 'dd/MM/yyyy')}</td>
                        <td className="px-3 py-2">{closure.hash.slice(0, 12)}…</td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {Object.entries(snapshot.totals)
                            .map(([k, v]) => `${k}: ${(Number(v) / 100).toFixed(2)} €`)
                            .join(' • ')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="sn-card space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Exports hebdomadaires & mensuels</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <select
                value={exportPeriod}
                onChange={(event) => setExportPeriod(event.target.value as 'week' | 'month')}
                className="rounded border border-slate-200 px-2 py-1.5 shadow-inner focus:border-blue-500 focus:outline-none"
              >
                <option value="week">Hebdomadaire</option>
                <option value="month">Mensuel</option>
              </select>
              {exportPeriod === 'month' ? (
                <input
                  type="month"
                  value={exportAnchor}
                  onChange={(event) => setExportAnchor(event.target.value)}
                  className="rounded border border-slate-200 px-2 py-1.5 shadow-inner focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <input
                  type="date"
                  value={exportAnchor.length === 10 ? exportAnchor : new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setExportAnchor(event.target.value)}
                  className="rounded border border-slate-200 px-2 py-1.5 shadow-inner focus:border-blue-500 focus:outline-none"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (!ledgerList.length) {
                    setToast({ type: 'error', message: 'Aucune donnée ledger à exporter.' })
                    return
                  }
                  let start: Date
                  let end: Date
                  if (exportPeriod === 'month') {
                    const [year, month] = exportAnchor.split('-').map(Number)
                    start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
                    end = new Date(Date.UTC(year, month, 0, 23, 59, 59))
                  } else {
                    const anchorDate = new Date(`${exportAnchor}T00:00:00Z`)
                    const dayOfWeek = anchorDate.getUTCDay()
                    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
                    start = new Date(anchorDate)
                    start.setUTCDate(anchorDate.getUTCDate() + diffToMonday)
                    start.setUTCHours(0, 0, 0, 0)
                    end = new Date(start)
                    end.setUTCDate(start.getUTCDate() + 6)
                    end.setUTCHours(23, 59, 59, 999)
                  }
                  const entries = ledgerList.filter((entry: any) => {
                    const occurred = new Date(entry.occurredAt)
                    return occurred >= start && occurred <= end
                  })
                  const totalCents = entries.reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0)
                  const byMethod: Record<string, number> = {}
                  const byType: Record<string, number> = {}
                  const counts: Record<string, number> = {}
                  entries.forEach((entry: any) => {
                    const method = entry.methodType || '—'
                    byMethod[method] = (byMethod[method] || 0) + (entry.amount || 0)
                    byType[entry.eventType] = (byType[entry.eventType] || 0) + (entry.amount || 0)
                    counts[entry.eventType] = (counts[entry.eventType] || 0) + 1
                  })
                  const periodLabel =
                    exportPeriod === 'month'
                      ? exportAnchor
                      : `${format(start, 'yyyy-MM-dd')} à ${format(end, 'yyyy-MM-dd')}`

                  const rows: string[][] = [
                    ['Entreprise', business.name],
                    ['Adresse', business.address],
                    ['Téléphone', business.phone],
                    ['SIRET', business.siret],
                    [],
                    ['Période', periodLabel],
                    ['Total brut', (totalCents / 100).toFixed(2) + ' €'],
                    ['Par méthode', ...Object.entries(byMethod).map(([k, v]) => `${k}: ${(v / 100).toFixed(2)} €`)],
                    ['Par type', ...Object.entries(byType).map(([k, v]) => `${k}: ${(v / 100).toFixed(2)} €`)],
                    ['Nombre opérations', ...Object.entries(counts).map(([k, v]) => `${k}: ${v}`)],
                    [],
                    ['Détails'],
                    ['Date', '#Reçu', 'Type', 'Provider', 'Méthode', 'Montant', 'Devise', 'Booking']
                  ]
                  entries.forEach((entry: any) => {
                    rows.push([
                      format(new Date(entry.occurredAt), 'yyyy-MM-dd HH:mm'),
                      entry.receiptNo
                        ? `${new Date(entry.occurredAt).getUTCFullYear()}-${String(entry.receiptNo).padStart(6, '0')}`
                        : '—',
                      entry.eventType,
                      entry.provider,
                      entry.methodType || '—',
                      (entry.amount / 100).toFixed(2),
                      entry.currency,
                      entry.bookingId || '—'
                    ])
                  })
                  const filename =
                    exportPeriod === 'month'
                      ? `ledger_${exportAnchor}.csv`
                      : `ledger_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.csv`
                  triggerCsvDownload(rows, filename)
                  setToast({ type: 'success', message: 'Export ledger généré.' })
                }}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-blue-700"
              >
                Exporter CSV
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Les exports incluent les totaux, la ventilation par méthode et la liste des opérations sur la période choisie.
            </p>
          </div>
        </div>
      </div>

      {showClosingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Décomposer le comptage</h3>
                <p className="text-sm text-slate-500">
                  Indiquez le nombre de billets et de pièces pour enregistrer la clôture et mesurer l'écart.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClosingModal(false)}
                className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Billets</h4>
                <div className="space-y-2">
                  {BILL_DENOMINATIONS.map((value) => {
                    const key = String(value)
                    const count = closingBreakdown.bills[key] ?? 0
                    return (
                      <div key={key} className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <span className="font-medium text-slate-800">{value} €</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={(event) =>
                              setClosingBreakdown((prev) => ({
                                ...prev,
                                bills: {
                                  ...prev.bills,
                                  [key]: Math.max(0, Number(event.target.value) || 0)
                                }
                              }))
                            }
                            className="w-20 rounded border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <span className="text-xs text-slate-500">{(value * count).toFixed(2)} €</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Pièces</h4>
                <div className="space-y-2">
                  {COIN_DENOMINATIONS.map((value) => {
                    const key = String(value)
                    const count = closingBreakdown.coins[key] ?? 0
                    return (
                      <div key={key} className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <span className="font-medium text-slate-800">{value.toFixed(2)} €</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={(event) =>
                              setClosingBreakdown((prev) => ({
                                ...prev,
                                coins: {
                                  ...prev.coins,
                                  [key]: Math.max(0, Number(event.target.value) || 0)
                                }
                              }))
                            }
                            className="w-20 rounded border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <span className="text-xs text-slate-500">{(value * count).toFixed(2)} €</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Montant saisi (rapide)
                </span>
                <span className="font-semibold text-slate-800">{centsToEuro(declaredClosingCents)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total calculé
                </span>
                <span className="font-semibold text-slate-800">{centsToEuro(computeBreakdownCents(closingBreakdown))}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Attendu (mouvements)
                </span>
                <span className="font-semibold text-slate-800">{centsToEuro(expectedForOpen)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Écart calculé
                </span>
                <span className="font-semibold text-slate-800">
                  {centsToEuro(computeBreakdownCents(closingBreakdown) - expectedForOpen)}
                </span>
              </div>
              <textarea
                value={closingNotes}
                onChange={(event) => setClosingNotes(event.target.value)}
                placeholder="Notes complémentaires (ex : explication d'un écart, remise exceptionnelle, etc.)"
                className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setClosingBreakdown(createEmptyBreakdown())}
                className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Réinitialiser les compteurs
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowClosingModal(false)}
                  className="rounded border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmitClosing}
                  disabled={isClosing}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  Enregistrer la clôture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSession && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Détail de la clôture</h3>
                <p className="text-sm text-slate-500">
                  Session ouverte le {format(new Date(selectedSession.openedAt), 'dd/MM/yyyy HH:mm')}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>

            {(() => {
              const breakdown = parseBreakdownPayload(selectedSession.closingBreakdown)
              if (!breakdown) {
                return <p className="mt-4 text-sm text-slate-500">Aucun détail enregistré pour cette session.</p>
              }
              const expected = selectedSession ? computeExpectedCents(selectedSession) : 0
              const counted = typeof selectedSession.closingCount === 'number' ? selectedSession.closingCount : 0
              const variance = counted - expected
              return (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendu</span>
                      <span className="font-semibold text-slate-800">{centsToEuro(expected)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compté</span>
                      <span className="font-semibold text-slate-800">{centsToEuro(counted)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Écart</span>
                      <span className={`font-semibold ${variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {centsToEuro(variance)}
                      </span>
                    </div>
                    {breakdown.declaredAmountCents !== undefined && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Montant saisi initialement
                        </span>
                        <span className="font-semibold text-slate-800">{centsToEuro(breakdown.declaredAmountCents)}</span>
                      </div>
                    )}
                    {breakdown.notes && (
                      <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">Notes :</span>
                        <br />
                        {breakdown.notes}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-slate-700">Billets</h4>
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left">Valeur</th>
                            <th className="px-3 py-2 text-right">Quantité</th>
                            <th className="px-3 py-2 text-right">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {BILL_DENOMINATIONS.map((value) => {
                            const qty = Number(breakdown?.bills?.[String(value)] ?? 0)
                            return (
                              <tr key={value} className="border-t border-slate-100">
                                <td className="px-3 py-2">{value} €</td>
                                <td className="px-3 py-2 text-right">{qty}</td>
                                <td className="px-3 py-2 text-right">{(value * qty).toFixed(2)} €</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-slate-700">Pièces</h4>
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left">Valeur</th>
                            <th className="px-3 py-2 text-right">Quantité</th>
                            <th className="px-3 py-2 text-right">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {COIN_DENOMINATIONS.map((value) => {
                            const qty = Number(breakdown?.coins?.[String(value)] ?? 0)
                            return (
                              <tr key={value} className="border-t border-slate-100">
                                <td className="px-3 py-2">{value.toFixed(2)} €</td>
                                <td className="px-3 py-2 text-right">{qty}</td>
                                <td className="px-3 py-2 text-right">{(value * qty).toFixed(2)} €</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
