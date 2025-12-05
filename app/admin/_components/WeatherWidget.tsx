'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
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

const formatHour = (iso: string) =>
  format(new Date(iso), 'HH:mm', {
    locale: fr
  })

export function WeatherWidget() {
  const { data, error, isLoading } = useSWR<AdminWeatherSnapshot>('/api/admin/weather', fetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
    shouldRetryOnError: true
  })

  const hourly = useMemo(() => data?.hourly.slice(0, 4) ?? [], [data])

  const state = data?.flags ?? { highWind: false, imminentRain: false }
  const windAlert = state.highWind
  const rainAlert = state.imminentRain

  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-2xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-5">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-amber-300 ${
              windAlert ? 'animate-pulse shadow-lg shadow-rose-500/30' : 'shadow-inner'
            }`}
          >
            {data ? conditionIcon(data.current.conditionCode) : <Sun className="h-12 w-12" />}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Conditions actuelles</p>
            {isLoading ? (
              <p className="mt-2 text-3xl font-semibold">Chargement…</p>
            ) : error ? (
              <p className="mt-2 text-3xl font-semibold text-rose-200">Aucune donnée météo</p>
            ) : (
              <div>
                <p className="mt-2 text-4xl font-semibold leading-none">
                  {data?.current.temperature ?? '—'}
                  <span className="text-2xl">°C</span>
                </p>
                <p className="text-sm text-white/70">
                  {data?.current.description ?? '—'} · Ressenti {data?.current.feelsLike ?? '—'}°C
                </p>
                <p className="text-xs text-white/60">
                  Mise à jour {data ? format(new Date(data.updatedAt), "HH:mm MMM d", { locale: fr }) : '—'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 rounded-2xl bg-white/10 p-4 text-sm">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
            <span>Vent</span>
            <span>Alizés</span>
          </div>
          <div className="flex items-end gap-4">
            <div className={`rounded-2xl px-4 py-3 text-xl font-semibold ${windAlert ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-white'}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wind className="h-4 w-4" />
                Vent moyen
              </div>
              <p>
                {data?.current.windKmh ?? '—'} <span className="text-base">km/h</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-white/80">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Rafales</p>
              <p className="text-2xl font-semibold">{data?.current.gustKmh ?? '—'} km/h</p>
              <p className="text-xs text-white/50">Seuil danger {data?.thresholdWindKmh ?? 25} km/h</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {windAlert ? (
              <span className="rounded-full bg-rose-600 px-3 py-1">Navigation dangereuse</span>
            ) : (
              <span className="rounded-full bg-emerald-600 px-3 py-1">Vent OK</span>
            )}
            {rainAlert ? <span className="rounded-full bg-sky-600 px-3 py-1">Pluie imminente</span> : null}
            {data?.alerts.length ? <span className="rounded-full bg-amber-500 px-3 py-1">{data.alerts.length} alerte(s)</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-black/20 p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
          <span>Fenêtre prochaine</span>
          <span>Temp · Vent · Pluie</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {hourly.length === 0 && !isLoading ? (
            <p className="text-sm text-white/70">Aucune prévision disponible.</p>
          ) : null}
          {hourly.map((entry) => (
            <div key={entry.timestamp} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{formatHour(entry.timestamp)}</p>
              <p className="mt-2 text-2xl font-semibold">{entry.temperature ?? '—'}°C</p>
              <p className="text-sm text-white/70">Vent {entry.windKmh} km/h</p>
              <p className="text-xs text-white/60">Rafales {entry.gustKmh} km/h</p>
              <p className="mt-1 text-xs text-white/80">Pluie {entry.precipitationChance}% ({entry.precipitationMm.toFixed(1)}mm)</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
