'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CloudLightning, CloudRain, Sun, ThermometerSun, Wind } from 'lucide-react'
import type { AdminWeatherSnapshot } from '@/lib/weather'

const fetcher = (url: string) => fetch(url).then(async (response) => {
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error ?? 'Weather API indisponible')
  }
  return response.json() as Promise<AdminWeatherSnapshot>
})

const conditionIcon = (code: string | null | undefined) => {
  const normalized = typeof code === 'string' ? code.toLowerCase() : ''
  switch (normalized) {
    case 'rain':
    case 'drizzle':
      return <CloudRain className="h-12 w-12" />
    case 'thunderstorm':
      return <CloudLightning className="h-12 w-12" />
    case 'clouds':
      return <ThermometerSun className="h-12 w-12" />
    case 'clear':
    default:
      return <Sun className="h-12 w-12" />
  }
}

const formatHour = (iso: string, locale: Locale) =>
  format(new Date(iso), 'HH:mm', {
    locale
  })

export type WeatherWidgetLabels = {
  currentConditions: string
  loading: string
  noData: string
  feelsLike: string
  updatedAtPrefix: string
  windTitle: string
  windSubtitle: string
  windAverage: string
  gusts: string
  dangerThreshold: string
  windDanger: string
  windOk: string
  rainAlert: string
  alertsCount: string
  windowTitle: string
  windowSubtitle: string
  noForecast: string
  futureWind: string
  futureGusts: string
  futureRain: string
}

const defaultLabels: WeatherWidgetLabels = {
  currentConditions: 'Conditions actuelles',
  loading: 'Chargement…',
  noData: 'Aucune donnée météo',
  feelsLike: 'Ressenti',
  updatedAtPrefix: 'Mise à jour',
  windTitle: 'Vent',
  windSubtitle: 'Alizés',
  windAverage: 'Vent moyen',
  gusts: 'Rafales',
  dangerThreshold: 'Seuil danger',
  windDanger: 'Navigation dangereuse',
  windOk: 'Vent OK',
  rainAlert: 'Pluie imminente',
  alertsCount: '{count} alerte(s)',
  windowTitle: 'Fenêtre prochaine',
  windowSubtitle: 'Temp · Vent · Pluie',
  noForecast: 'Aucune prévision disponible.',
  futureWind: 'Vent',
  futureGusts: 'Rafales',
  futureRain: 'Pluie'
}

type WeatherWidgetProps = {
  endpoint?: string
  initialData?: AdminWeatherSnapshot | null
  labels?: Partial<WeatherWidgetLabels>
  dateLocale?: Locale
}

export function WeatherWidget({
  endpoint = '/api/admin/weather',
  initialData = null,
  labels,
  dateLocale
}: WeatherWidgetProps) {
  const labelSet = { ...defaultLabels, ...labels }
  const locale = dateLocale ?? fr
  const formatAlertsCount = (count: number) => labelSet.alertsCount.replace('{count}', `${count}`)

  const { data, error, isLoading } = useSWR<AdminWeatherSnapshot>(endpoint, fetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
    shouldRetryOnError: true,
    fallbackData: initialData ?? undefined
  })

  const hourly = useMemo(() => data?.hourly.slice(0, 4) ?? [], [data])

  const state = data?.flags ?? { highWind: false, imminentRain: false }
  const windAlert = state.highWind
  const rainAlert = state.imminentRain

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-5">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-amber-500 ${
              windAlert ? 'animate-pulse shadow-lg shadow-rose-400/30' : 'shadow-inner'
            }`}
          >
            {data ? conditionIcon(data.current.conditionCode) : <Sun className="h-12 w-12" />}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{labelSet.currentConditions}</p>
            {isLoading ? (
              <p className="mt-2 text-3xl font-semibold">{labelSet.loading}</p>
            ) : error ? (
              <p className="mt-2 text-3xl font-semibold text-rose-500">{labelSet.noData}</p>
            ) : (
              <div>
                <p className="mt-2 text-4xl font-semibold leading-none">
                  {data?.current.temperature ?? '—'}
                  <span className="text-2xl">°C</span>
                </p>
                <p className="text-sm text-slate-600">
                  {data?.current.description ?? '—'} · {labelSet.feelsLike} {data?.current.feelsLike ?? '—'}°C
                </p>
                <p className="text-xs text-slate-500">
                  {labelSet.updatedAtPrefix}{' '}
                  {data ? format(new Date(data.updatedAt), 'HH:mm MMM d', { locale }) : '—'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-900">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
            <span>{labelSet.windTitle}</span>
            <span>{labelSet.windSubtitle}</span>
          </div>
          <div className="flex items-end gap-4">
            <div className={`rounded-2xl px-4 py-3 text-xl font-semibold text-white ${windAlert ? 'bg-rose-600' : 'bg-emerald-500'}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wind className="h-4 w-4" />
                {labelSet.windAverage}
              </div>
              <p>
                {data?.current.windKmh ?? '—'} <span className="text-base">km/h</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-slate-800 shadow-inner">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{labelSet.gusts}</p>
              <p className="text-2xl font-semibold">{data?.current.gustKmh ?? '—'} km/h</p>
              <p className="text-xs text-slate-500">{labelSet.dangerThreshold} {data?.thresholdWindKmh ?? 25} km/h</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {windAlert ? (
              <span className="rounded-full bg-rose-600 px-3 py-1 text-white shadow-sm">{labelSet.windDanger}</span>
            ) : (
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-white shadow-sm">{labelSet.windOk}</span>
            )}
            {rainAlert ? <span className="rounded-full bg-sky-500 px-3 py-1 text-white shadow-sm">{labelSet.rainAlert}</span> : null}
            {data?.alerts.length ? (
              <span className="rounded-full bg-amber-500 px-3 py-1 text-white shadow-sm">{formatAlertsCount(data.alerts.length)}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-500">
          <span>{labelSet.windowTitle}</span>
          <span>{labelSet.windowSubtitle}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {hourly.length === 0 && !isLoading ? (
            <p className="text-sm text-slate-600">{labelSet.noForecast}</p>
          ) : null}
          {hourly.map((entry) => (
            <div key={entry.timestamp} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{formatHour(entry.timestamp, locale)}</p>
              <p className="mt-2 text-2xl font-semibold">{entry.temperature ?? '—'}°C</p>
              <p className="text-sm text-slate-700">{labelSet.futureWind} {entry.windKmh} km/h</p>
              <p className="text-xs text-slate-500">{labelSet.futureGusts} {entry.gustKmh} km/h</p>
              <p className="mt-1 text-xs text-slate-500">{labelSet.futureRain} {entry.precipitationChance}% ({entry.precipitationMm.toFixed(1)}mm)</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
