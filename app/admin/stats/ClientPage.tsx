'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import Link from 'next/link'
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear
} from 'date-fns'
import { AdminPageShell } from '../_components/AdminPageShell'
import { readCache, writeCache } from '@/lib/mobileCache'

type TimeRange = 'day' | 'month' | 'year' | 'custom'

type PaymentBreakdown = {
  cash?: number
  card?: number
  paypal?: number
  applepay?: number
  googlepay?: number
  ANCV?: number
  CityPass?: number
}

type LanguageStat = {
  language: string
  _count: { id: number }
}

type HourStat = {
  hour: string
  count: number
  revenue: number
}

type SeriesPoint = {
  date: string
  bookings: number
  revenue: number
}

type AccountingRow = {
  bookingId: string
  boat?: string | null
  date: string
  time: string
  name: string
  people: number
  amount: number
  method: string
}

type StatsResponse = {
  revenue?: number
  passengers?: number
  bookingsCount?: number
  paymentBreakdown?: PaymentBreakdown
  noShow?: number
  cancelled?: number
  avgPerBooking?: number
  avgPerPerson?: number
  byLanguage?: LanguageStat[]
  statusDist?: Record<string, number>
  seriesDaily?: SeriesPoint[]
  byHour?: HourStat[]
  accounting?: AccountingRow[]
}

type DateRange = { start: string; end: string }

type RangeOption = {
  key: TimeRange
  label: string
}

const RANGE_OPTIONS: RangeOption[] = [
  { key: 'day', label: 'Aujourdhui' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year', label: 'Cette annee' },
  { key: 'custom', label: 'Personnalise' }
]

const formatCurrency = (value: number | undefined) => {
  const safe = Number.isFinite(value) ? Number(value) : 0
  const fixed = safe.toFixed(2)
  const [integer, decimals] = fixed.split('.')
  const withSpaces = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${withSpaces},${decimals} EUR`
}

const formatInteger = (value: number | undefined) => {
  const safe = Math.round(Number.isFinite(value) ? Number(value) : 0)
  return safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const DEFAULT_BREAKDOWN: PaymentBreakdown = {
  cash: 0,
  card: 0,
  paypal: 0,
  applepay: 0,
  googlepay: 0,
  ANCV: 0,
  CityPass: 0
}

const computeRange = (
  range: TimeRange,
  customRange: DateRange
): { apiRange: DateRange; cacheKey: string } | null => {
  const now = new Date()

  if (range === 'custom') {
    if (!customRange.start || !customRange.end) {
      return null
    }
    const startDate = new Date(customRange.start)
    const endDate = new Date(customRange.end)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return null
    }

    if (startDate > endDate) {
      return null
    }

    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(endDate, 'yyyy-MM-dd')

    return {
      apiRange: { start: startStr, end: endStr },
      cacheKey: `custom:${startStr}:${endStr}`
    }
  }

  let startDate: Date
  let endDate: Date

  if (range === 'day') {
    startDate = startOfDay(now)
    endDate = endOfDay(now)
  } else if (range === 'month') {
    startDate = startOfMonth(now)
    endDate = endOfMonth(now)
  } else {
    startDate = startOfYear(now)
    endDate = endOfYear(now)
  }

  const startStr = format(startDate, 'yyyy-MM-dd')
  const endStr = format(endDate, 'yyyy-MM-dd')

  return {
    apiRange: { start: startStr, end: endStr },
    cacheKey: `${range}:${startStr}:${endStr}`
  }
}

export default function ClientStatsPage() {
  const [range, setRange] = useState<TimeRange>('month')
  const [customRange, setCustomRange] = useState<DateRange>({ start: '', end: '' })
  const [appliedRange, setAppliedRange] = useState<DateRange>({ start: '', end: '' })
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null)
  const [lastSource, setLastSource] = useState<'network' | 'cache' | null>(null)
  const [backgroundSyncing, setBackgroundSyncing] = useState(false)
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const cacheRef = useRef<Record<string, StatsResponse>>({})

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setBackgroundSyncing(false)

    const result = computeRange(range, customRange)

    if (!result) {
      setError('Selection invalide. Verifiez les dates.')
      setData(null)
      setAppliedRange({ start: '', end: '' })
      setLoading(false)
      return
    }

    const { apiRange, cacheKey } = result
    const storageKey = `stats:${cacheKey}`
    const cached = cacheRef.current[cacheKey]

    if (cached) {
      setData(cached)
      setAppliedRange(apiRange)
      setError(null)
      setLoading(false)
      return
    }

    setError(null)
    let fallbackUsed = false

    const stored = await readCache<StatsResponse>(storageKey)
    if (stored) {
      fallbackUsed = true
      cacheRef.current[cacheKey] = stored.payload
      setData(stored.payload)
      setAppliedRange(apiRange)
      setCacheTimestamp(stored.timestamp)
      setLastSource('cache')
      setLoading(false)
      if (isOffline) {
        return
      }
      setBackgroundSyncing(true)
    }

    try {
      const res = await fetch(`/api/admin/stats?start=${apiRange.start}&end=${apiRange.end}`, {
        cache: 'no-store'
      })

      if (!res.ok) {
        throw new Error(`Erreur API ${res.status}`)
      }

      const json = (await res.json()) as StatsResponse
      cacheRef.current[cacheKey] = json
      setData(json)
      setAppliedRange(apiRange)
      setCacheTimestamp(Date.now())
      setLastSource('network')
      void writeCache(storageKey, json)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sn-sync', { detail: { source: 'stats' } }))
      }
    } catch (err) {
      console.error('Erreur chargement stats', err)
      if (!fallbackUsed) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
        setData(null)
      } else {
        setError('Mode hors ligne · donnees locales affichees')
      }
    } finally {
      setBackgroundSyncing(false)
      if (!fallbackUsed) {
        setLoading(false)
      }
    }
  }, [range, customRange, isOffline])

  useEffect(() => {
    fetchStats()
    const interval = window.setInterval(() => {
      void fetchStats()
    }, 90_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [fetchStats])

  const handleRangeChange = (key: TimeRange) => {
    setRange(key)
    if (key !== 'custom') {
      setCustomRange({ start: '', end: '' })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    if (!data?.accounting?.length) return
    exportAccountingCSV(data.accounting)
  }

  const rangeLabel = useMemo(() => {
    if (!appliedRange.start || !appliedRange.end) {
      return 'Aucune periode appliquee'
    }
    if (appliedRange.start === appliedRange.end) {
      return `Periode: ${appliedRange.start}`
    }
    return `Periode: ${appliedRange.start} -> ${appliedRange.end}`
  }, [appliedRange])

  const paymentBreakdown = useMemo(
    () => ({
      ...DEFAULT_BREAKDOWN,
      ...(data?.paymentBreakdown ?? {})
    }),
    [data]
  )

  const kpis = useMemo(
    () => [
      {
        title: "Chiffre d'affaires",
        value: formatCurrency(data?.revenue)
      },
      {
        title: 'Passagers',
        value: formatInteger(data?.passengers)
      },
      {
        title: 'Reservations',
        value: formatInteger(data?.bookingsCount)
      }
    ],
    [data]
  )

  const secondaryKpis = useMemo(
    () => [
      { label: 'No show', value: formatInteger(data?.noShow) },
      { label: 'Annulees', value: formatInteger(data?.cancelled) },
      { label: 'Panier moyen', value: formatCurrency(data?.avgPerBooking) },
      { label: 'Montant par personne', value: formatCurrency(data?.avgPerPerson) }
    ],
    [data]
  )

  const languageStats = useMemo(() => {
    const total = data?.bookingsCount ?? 0
    return (data?.byLanguage ?? []).map((item) => {
      const percent = total > 0 ? Math.round((item._count.id / total) * 100) : 0
      return {
        language: item.language,
        percent,
        count: item._count.id
      }
    })
  }, [data])

  const statusData = useMemo(() => toBarData(data?.statusDist ?? {}), [data])
  const dailySeries = useMemo(() => data?.seriesDaily ?? [], [data])
  const hourlySeries = useMemo(() => data?.byHour ?? [], [data])
  const cacheTimeLabel = useMemo(() => {
    if (!cacheTimestamp) return ''
    try {
      return format(new Date(cacheTimestamp), 'HH:mm')
    } catch (timeError) {
      console.warn('Formatage horodatage cache impossible', timeError)
      return ''
    }
  }, [cacheTimestamp])
  const usingCachedData = lastSource === 'cache'

  const isCustomRangeInvalid = useMemo(() => {
    if (range !== 'custom') return false
    if (!customRange.start || !customRange.end) return true
    return new Date(customRange.start) > new Date(customRange.end)
  }, [range, customRange])

  const actions = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handlePrint}
        className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50"
      >
        Imprimer ou PDF
      </button>
      <button
        type="button"
        onClick={handleExport}
        disabled={!data?.accounting?.length}
        className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Export CSV
      </button>
    </div>
  )

  return (
    <AdminPageShell
      title="Statistiques et performances"
      description="Analysez les indicateurs cles afin de piloter l'activite."
      actions={actions}
    >
      <div className="space-y-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-slate-500">{rangeLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleRangeChange(option.key)}
                className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                  range === option.key
                    ? 'scale-105 border-blue-500 bg-blue-600 text-white shadow-md'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {(isOffline || cacheTimeLabel || usingCachedData || backgroundSyncing) && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {isOffline ? (
            <span className="sn-pill sn-pill--amber">
              <span className="sn-pill__dot" aria-hidden="true" />
              Mode hors ligne
            </span>
            ) : null}
            {!isOffline && cacheTimeLabel ? (
            <span className="sn-pill sn-pill--emerald">
              <span className="sn-pill__dot" aria-hidden="true" />
              Synchro {cacheTimeLabel}
            </span>
            ) : null}
            {usingCachedData ? (
            <span className="sn-pill sn-pill--slate">
              <span className="sn-pill__dot" aria-hidden="true" />
              Cache local
            </span>
            ) : null}
            {backgroundSyncing ? (
            <span className="sn-pill sn-pill--sky">
              <span className="sn-pill__dot" aria-hidden="true" />
              Mise a jour en cours
            </span>
            ) : null}
          </div>
          )}
        </div>

        {range === 'custom' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,180px))_auto] sm:items-end">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Debut</label>
                <input
                  type="date"
                  value={customRange.start}
                  onChange={(event) =>
                    setCustomRange((prev) => ({ ...prev, start: event.target.value }))
                  }
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fin</label>
                <input
                  type="date"
                  value={customRange.end}
                  onChange={(event) =>
                    setCustomRange((prev) => ({ ...prev, end: event.target.value }))
                  }
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 shadow-inner focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={fetchStats}
                disabled={isCustomRangeInvalid}
                className="h-10 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Appliquer
              </button>
            </div>
            {isCustomRangeInvalid && (
              <p className="mt-2 text-xs font-semibold text-rose-600">
                Selection invalide. La date de debut doit preceder la date de fin.
              </p>
            )}
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchStats} />
        ) : data ? (
          <div className="space-y-8">
            <section>
              <div className="grid gap-4 sm:grid-cols-3">
                {kpis.map((item) => (
                  <MetricCard
                    key={item.title}
                    title={item.title}
                    value={item.value}
                    accentClass="border-l-4 border-blue-500"
                  />
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Caisse par mode de paiement</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <BreakdownRow label="Especes" value={formatCurrency(paymentBreakdown.cash)} />
                  <BreakdownRow label="Carte bancaire" value={formatCurrency(paymentBreakdown.card)} />
                  <BreakdownRow label="PayPal" value={formatCurrency(paymentBreakdown.paypal)} />
                  <BreakdownRow label="Apple Pay" value={formatCurrency(paymentBreakdown.applepay)} />
                  <BreakdownRow label="Google Pay" value={formatCurrency(paymentBreakdown.googlepay)} />
                </div>
                <p className="text-xs text-slate-500">ANCV et City Pass sont comptes a part.</p>
              </div>

              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Vouchers hors caisse</h2>
                <p className="text-xs text-slate-500">Compteur en nombre de titres.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <BreakdownRow label="ANCV" value={(paymentBreakdown.ANCV ?? 0).toString()} />
                  <BreakdownRow label="City Pass" value={(paymentBreakdown.CityPass ?? 0).toString()} />
                </div>
                <p className="text-xs text-slate-500">
                  City Pass: les enfants sont inclus avec l&apos;adulte, basee sur les adultes par reservation.
                </p>
              </div>
            </section>

            <section>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {secondaryKpis.map((item) => (
                  <SummaryStat key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Langues demandees</h2>
                <div className="mt-4 space-y-4">
                  {languageStats.length ? (
                    languageStats.map((item) => (
                      <div key={item.language}>
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                          <span>{item.language}</span>
                          <span>
                            {item.percent}% ({item.count})
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${Math.min(100, item.percent)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">Aucune donnee disponible.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Reservations par statut</h2>
                <ColumnChart data={statusData} emptyLabel="Aucun statut disponible" />
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <ChartSection title="Trajectoire quotidienne">
                <Sparkline data={dailySeries} />
              </ChartSection>
              <ChartSection title="Remplissage par heure">
                <ColumnChart data={toHourBar(hourlySeries)} emptyLabel="Aucune plage horaire" />
              </ChartSection>
            </section>

            <section className="space-y-6">
              <ChartSection title="Comptabilite detaillee">
                <AccountingTable items={data.accounting ?? []} formatCurrency={formatCurrency} />
              </ChartSection>
              <TotalsSummary paymentBreakdown={paymentBreakdown} formatCurrency={formatCurrency} />
            </section>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucune donnee a afficher.</p>
        )}
      </div>
    </AdminPageShell>
  )
}

function MetricCard({
  title,
  value,
  accentClass
}: {
  title: string
  value: string
  accentClass?: string
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${accentClass ?? ''}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function ChartSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function ColumnChart({
  data,
  emptyLabel
}: {
  data: Array<{ label: string; value: number }>
  emptyLabel: string
}) {
  if (!data.length) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="grid grid-cols-6 items-end gap-3">
      {data.map((item) => {
        const height = Math.max(8, (item.value / maxValue) * 120)
        return (
          <div key={item.label} className="flex flex-col items-center">
            <div
              className="w-10 rounded-md bg-blue-500"
              style={{ height: `${height}px` }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="mt-2 text-[10px] font-semibold text-slate-600">{item.label}</span>
            <span className="text-[10px] text-slate-400">{formatInteger(item.value)}</span>
          </div>
        )
      })}
    </div>
  )
}

function Sparkline({ data }: { data: SeriesPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-slate-400">Aucune donnee quotidienne.</p>
  }

  const maxBookings = Math.max(...data.map((item) => item.bookings), 1)
  const points = data.map((item, index) => {
    const x = (index / Math.max(1, data.length - 1)) * 100
    const y = 100 - (item.bookings / maxBookings) * 100
    return `${x},${y}`
  })

  return (
    <div className="relative h-48">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polyline
          points={points.join(' ')}
          fill="none"
          strokeWidth={2}
          stroke="#2563eb"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 grid grid-cols-6 text-[10px] text-slate-500">
        {data.slice(0, 6).map((item) => (
          <span key={item.date} className="truncate">
            {item.date.slice(8, 10)}
          </span>
        ))}
      </div>
    </div>
  )
}

function toBarData(record: Record<string, number>) {
  return Object.entries(record).map(([label, value]) => ({ label, value }))
}

function toHourBar(entries: HourStat[]) {
  return entries.map((entry) => ({ label: entry.hour, value: entry.count }))
}

function AccountingTable({
  items,
  formatCurrency
}: {
  items: AccountingRow[]
  formatCurrency: (value: number | undefined) => string
}) {
  if (!items.length) {
    return <p className="text-sm text-slate-400">Aucun paiement sur la periode.</p>
  }

  const grandTotals = items.reduce(
    (acc, item) => {
      acc.total += item.amount ?? 0
      acc.people += item.people ?? 0
      return acc
    },
    { total: 0, people: 0 }
  )

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm text-slate-700">
        <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="p-2 text-left">Booking</th>
            <th className="p-2 text-left">Bateau</th>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Heure</th>
            <th className="p-2 text-left">Client</th>
            <th className="p-2 text-right">Pers.</th>
            <th className="p-2 text-right">Montant</th>
            <th className="p-2 text-left">Mode</th>
          </tr>
        </thead>
        <tbody className="divide-y border-t">
          {(() => {
            const rows: ReactNode[] = []
            let currentDate = ''
            let dayTotals = { total: 0, people: 0 }

            const flush = () => {
              if (!currentDate) return
              rows.push(
                <tr key={`subtotal-${currentDate}`} className="bg-slate-50 font-semibold">
                  <td className="p-2">Sous-total</td>
                  <td className="p-2" />
                  <td className="p-2">{currentDate}</td>
                  <td className="p-2" />
                  <td className="p-2" />
                  <td className="p-2 text-right">{formatInteger(dayTotals.people)}</td>
                  <td className="p-2 text-right">{formatCurrency(dayTotals.total)}</td>
                  <td className="p-2" />
                </tr>
              )
            }

            items.forEach((item, index) => {
              if (item.date !== currentDate) {
                if (currentDate) flush()
                currentDate = item.date
                dayTotals = { total: 0, people: 0 }
              }

              dayTotals.total += item.amount ?? 0
              dayTotals.people += item.people ?? 0

              rows.push(
                <tr key={`${item.bookingId}-${index}`}>
                  <td className="p-2">{item.bookingId}</td>
                  <td className="p-2">{item.boat || '-'}</td>
                  <td className="p-2">{item.date}</td>
                  <td className="p-2">{item.time}</td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2 text-right">{formatInteger(item.people)}</td>
                  <td className="p-2 text-right">{formatCurrency(item.amount)}</td>
                  <td className="p-2">{item.method}</td>
                </tr>
              )

              if (index === items.length - 1) {
                flush()
              }
            })

            return rows
          })()}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-semibold">
            <td className="p-2">Total</td>
            <td className="p-2" />
            <td className="p-2" />
            <td className="p-2" />
            <td className="p-2" />
            <td className="p-2 text-right">{formatInteger(grandTotals.people)}</td>
            <td className="p-2 text-right">{formatCurrency(grandTotals.total)}</td>
            <td className="p-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function exportAccountingCSV(items: AccountingRow[]) {
  if (!items.length) return

  const headers = ['BookingId', 'Boat', 'Date', 'Time', 'Client', 'People', 'AmountEUR', 'Method']

  const escapeCell = (value: string | number | null | undefined) => {
    const cell = String(value ?? '')
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return '"' + cell.replace(/"/g, '""') + '"'
    }
    return cell
  }

  const rows = [headers.join(',')]

  items.forEach((item) => {
    rows.push(
      [
        escapeCell(item.bookingId),
        escapeCell(item.boat || ''),
        escapeCell(item.date),
        escapeCell(item.time),
        escapeCell(item.name),
        escapeCell(item.people ?? 0),
        escapeCell((item.amount ?? 0).toFixed(2)),
        escapeCell(item.method)
      ].join(',')
    )
  })

  const totalPeople = items.reduce((acc, item) => acc + (item.people ?? 0), 0)
  const totalAmount = items.reduce((acc, item) => acc + (item.amount ?? 0), 0)

  const totalsByMethod: Record<string, number> = {}
  items.forEach((item) => {
    const key = item.method || 'Inconnu'
    totalsByMethod[key] = (totalsByMethod[key] ?? 0) + (item.amount ?? 0)
  })

  rows.push('')
  rows.push(['TOTAL', '', '', '', '', totalPeople, totalAmount.toFixed(2), ''].join(','))
  Object.entries(totalsByMethod).forEach(([method, amount]) => {
    rows.push([`TOTAL_${method}`, '', '', '', '', '', amount.toFixed(2), method].join(','))
  })

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `accounting_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function TotalsSummary({
  paymentBreakdown,
  formatCurrency
}: {
  paymentBreakdown: PaymentBreakdown
  formatCurrency: (value: number | undefined) => string
}) {
  const caisse =
    (paymentBreakdown.cash ?? 0) +
    (paymentBreakdown.card ?? 0) +
    (paymentBreakdown.paypal ?? 0) +
    (paymentBreakdown.applepay ?? 0) +
    (paymentBreakdown.googlepay ?? 0)
  const vouchers = (paymentBreakdown.ANCV ?? 0) + (paymentBreakdown.CityPass ?? 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Synthese caisse</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BreakdownRow label="Total caisse" value={formatCurrency(caisse)} />
        <BreakdownRow label="Vouchers" value={vouchers.toString()} />
        <BreakdownRow label="Especes" value={formatCurrency(paymentBreakdown.cash)} />
        <BreakdownRow label="Carte bancaire" value={formatCurrency(paymentBreakdown.card)} />
        <BreakdownRow label="PayPal" value={formatCurrency(paymentBreakdown.paypal)} />
        <BreakdownRow label="Apple Pay" value={formatCurrency(paymentBreakdown.applepay)} />
        <BreakdownRow label="Google Pay" value={formatCurrency(paymentBreakdown.googlepay)} />
        <BreakdownRow label="ANCV" value={(paymentBreakdown.ANCV ?? 0).toString()} />
        <BreakdownRow label="City Pass" value={(paymentBreakdown.CityPass ?? 0).toString()} />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
      <p className="text-lg font-semibold text-rose-700">Impossible de charger les statistiques.</p>
      <p className="mt-2 text-sm text-rose-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
      >
        Reessayer
      </button>
    </div>
  )
}
