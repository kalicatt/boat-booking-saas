'use client'

import useSWR from 'swr'
import type { AdminWeatherSnapshot } from '@/lib/weather'

const fetcher = (url: string) => fetch(url).then((response) => {
  if (!response.ok) {
    throw new Error('Weather API failed')
  }
  return response.json() as Promise<AdminWeatherSnapshot>
})

type WeatherBadgeProps = {
  endpoint?: string
  initialData?: AdminWeatherSnapshot | null
  className?: string
}

export function WeatherBadge({ endpoint = '/api/admin/weather', initialData = null, className }: WeatherBadgeProps) {
  const { data, error } = useSWR<AdminWeatherSnapshot>(endpoint, fetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
    fallbackData: initialData ?? undefined
  })

  if (error) {
    return (
      <span className={`rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 ${className ?? ''}`}>
        Météo HS
      </span>
    )
  }

  if (!data) {
    return (
      <span className={`rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 ${className ?? ''}`}>
        Météo…
      </span>
    )
  }

  const icon = data.flags.highWind ? '🌬️' : data.flags.imminentRain ? '🌧️' : '☀️'
  const alertClass = data.flags.highWind
    ? 'bg-rose-600 text-white'
    : data.flags.imminentRain
    ? 'bg-sky-600 text-white'
    : 'bg-white text-slate-700'

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold shadow-sm ${alertClass} ${className ?? ''}`.trim()}
    >
      <span aria-hidden="true">{icon}</span>
      <span>
        {data.current.temperature ?? '—'}°C · {data.current.windKmh ?? '—'} km/h
      </span>
    </div>
  )
}
