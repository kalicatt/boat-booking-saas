import { ensureAdminPageAccess } from '@/lib/adminAccess'
import { getAdminWeatherSnapshot } from '@/lib/weather'
import { WeatherWidget } from '@/app/admin/_components/WeatherWidget'
import { WeatherBadge } from '@/app/admin/_components/WeatherBadge'
import { WeatherRefreshButton } from '@/app/admin/_components/WeatherRefreshButton'

const PARIS_TZ = { timeZone: 'Europe/Paris' } as const

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    ...PARIS_TZ
  }).format(new Date(value))

const formatHour = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    ...PARIS_TZ
  }).format(new Date(value))

type StatCardProps = {
  label: string
  value: string
  helper?: string
}

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
      <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  )
}

export default async function AdminWeatherPage() {
  await ensureAdminPageAccess({ page: 'weather', auditEvent: 'UNAUTHORIZED_WEATHER' })
  const snapshot = await getAdminWeatherSnapshot()
  const hourly = snapshot.hourly.slice(0, 8)
  const lastUpdate = formatDateTime(snapshot.updatedAt)

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Outils météo</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">Conditions opérationnelles</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Données issues d&rsquo;OpenWeather OneCall. Elles sont partagées à toute l&rsquo;équipe pour décider rapidement
            des ouvertures, limiter les départs ou prévenir les clients.
          </p>
          <p className="mt-2 text-xs text-slate-500">Dernière mise à jour : {lastUpdate}</p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <WeatherBadge endpoint="/api/admin/weather" initialData={snapshot} />
          <WeatherRefreshButton className="md:self-end" />
          <p className="text-xs text-slate-400">Lat {snapshot.location.lat.toFixed(3)} · Lon {snapshot.location.lon.toFixed(3)}</p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
          <WeatherWidget endpoint="/api/admin/weather" initialData={snapshot} />
        </div>
        <div className="space-y-4">
          <StatCard
            label="Vent moyen"
            value={`${snapshot.current.windKmh ?? '—'} km/h`}
            helper={`Seuil interne : ${snapshot.thresholdWindKmh} km/h`}
          />
          <StatCard label="Rafales" value={`${snapshot.current.gustKmh ?? '—'} km/h`} />
          <StatCard
            label="Pression"
            value={snapshot.current.pressure ? `${snapshot.current.pressure} hPa` : '—'}
            helper={`Humidité ${snapshot.current.humidity ?? '—'}% · UV ${snapshot.current.uvIndex ?? '—'}`}
          />
          <div className="rounded-2xl border border-slate-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Consigne</p>
            <p className="mt-1">
              Vent fort = informer les bateliers et réduire les embarquements. Pluie imminente = prévoir bâches et
              message visiteurs.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Alertes officielles</p>
            <h2 className="text-2xl font-semibold text-slate-900">Bulletins vent / pluie</h2>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
            {snapshot.alerts.length} en cours
          </span>
        </div>
        <div className="mt-4 space-y-4">
          {snapshot.alerts.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune alerte remontée sur les dernières 24h.</p>
          ) : (
            snapshot.alerts.map((alert) => (
              <article
                key={`${alert.event}-${alert.start}`}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold uppercase tracking-widest text-amber-800">
                    Alerte
                  </span>
                  <p className="font-semibold text-slate-900">{alert.event}</p>
                </div>
                <p className="mt-2 text-slate-600">{alert.description ?? '—'}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Du {formatDateTime(alert.start)} au {formatDateTime(alert.end)} · {alert.sender ?? 'Source inconnue'}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Fenêtre à venir</p>
            <h2 className="text-2xl font-semibold text-slate-900">Prévisions horaires détaillées</h2>
          </div>
          <span className="text-xs text-slate-500">{hourly.length} points</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {hourly.map((entry) => (
            <div key={entry.timestamp} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{formatHour(entry.timestamp)}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{entry.temperature ?? '—'}°C</p>
              <p>Vent {entry.windKmh} km/h · Rafales {entry.gustKmh} km/h</p>
              <p className="text-xs text-slate-500">Pluie {entry.precipitationChance}% ({entry.precipitationMm.toFixed(1)} mm)</p>
              <p className="text-xs text-slate-400">{entry.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
