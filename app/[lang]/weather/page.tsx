import Link from 'next/link'
import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import { enUS, fr, de, es, it } from 'date-fns/locale'
import { WeatherBadge } from '@/app/admin/_components/WeatherBadge'
import { WeatherWidget, type WeatherWidgetLabels } from '@/app/admin/_components/WeatherWidget'
import { getDictionary, type SupportedLocale } from '@/lib/get-dictionary'
import { getPublicWeatherSnapshot } from '@/lib/weather'

const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'fr', 'de', 'es', 'it']
const DATE_LOCALES: Record<SupportedLocale, Locale> = {
  en: enUS,
  fr,
  de,
  es,
  it
}

type WeatherAlertsCopy = {
  title?: string
  subtitle?: string
  empty?: string
  badge?: string
  source?: string
  duration?: string
  impact?: string
}

type WeatherInsightsCopy = {
  title?: string
  subtitle?: string
  humidity?: string
  pressure?: string
  sunrise?: string
  sunset?: string
  uv?: string
}

type WeatherPageCopy = {
  eyebrow?: string
  title?: string
  subtitle?: string
  back?: string
  alertsLink?: string
  badge?: string
  widget?: Partial<WeatherWidgetLabels>
  alerts?: WeatherAlertsCopy
  insights?: WeatherInsightsCopy
}

const defaultCopy: Required<Pick<WeatherPageCopy, 'eyebrow' | 'title' | 'subtitle' | 'back' | 'alertsLink' | 'badge'>> = {
  eyebrow: 'Conditions en direct',
  title: 'Bulletin Météo',
  subtitle: 'Vent, pluie et alertes mis à jour chaque heure pour planifier vos promenades.',
  back: '← Retour à l’accueil',
  alertsLink: 'Voir les alertes',
  badge: 'Bulletin public'
}

const defaultAlerts: Required<Pick<WeatherAlertsCopy, 'title' | 'subtitle' | 'empty' | 'badge' | 'source' | 'duration' | 'impact'>> = {
  title: 'Alertes vent & pluie',
  subtitle: 'Nous relayons les bulletins Météo-France qui peuvent impacter les départs.',
  empty: 'Aucune alerte recensée sur les dernières 24h.',
  badge: 'Alerte active',
  source: 'Source',
  duration: '{start} → {end}',
  impact: 'Seuil {threshold} km/h'
}

const defaultInsights: Required<Pick<WeatherInsightsCopy, 'title' | 'subtitle' | 'humidity' | 'pressure' | 'sunrise' | 'sunset' | 'uv'>> = {
  title: 'Indicateurs complémentaires',
  subtitle: 'Contexte issu du même relevé météo.',
  humidity: 'Humidité',
  pressure: 'Pression',
  sunrise: 'Lever du soleil',
  sunset: 'Coucher du soleil',
  uv: 'Indice UV'
}

export const revalidate = 0

export default async function WeatherPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params
  const safeLang: SupportedLocale = SUPPORTED_LOCALES.includes(rawLang as SupportedLocale)
    ? (rawLang as SupportedLocale)
    : 'en'

  const [dict, snapshot] = await Promise.all([getDictionary(safeLang), getPublicWeatherSnapshot()])
  const copy = (dict.weatherPage ?? {}) as WeatherPageCopy
  const alertsCopy = { ...defaultAlerts, ...(copy.alerts ?? {}) }
  const insightsCopy = { ...defaultInsights, ...(copy.insights ?? {}) }
  const heroCopy = { ...defaultCopy, ...copy }
  const widgetLabels = copy.widget
  const locale = DATE_LOCALES[safeLang] ?? enUS

  const updatedStamp = format(new Date(snapshot.updatedAt), 'EEEE d MMMM · HH:mm', { locale })
  const alertDuration = (start: string, end: string) => {
    const startLabel = format(new Date(start), 'dd MMM · HH:mm', { locale })
    const endLabel = format(new Date(end), 'dd MMM · HH:mm', { locale })
    return alertsCopy.duration.replace('{start}', startLabel).replace('{end}', endLabel)
  }
  const alertImpact = (threshold: number) => alertsCopy.impact.replace('{threshold}', `${threshold}`)

  const sunrise = snapshot.current.sunRise
    ? format(new Date(snapshot.current.sunRise), 'HH:mm', { locale })
    : '—'
  const sunset = snapshot.current.sunSet
    ? format(new Date(snapshot.current.sunSet), 'HH:mm', { locale })
    : '—'
  const humidity = snapshot.current.humidity != null ? `${snapshot.current.humidity}%` : '—'
  const pressure = snapshot.current.pressure != null ? `${snapshot.current.pressure} hPa` : '—'
  const uvIndex = snapshot.current.uvIndex != null ? snapshot.current.uvIndex.toFixed(1) : '—'

  const insights = [
    { key: 'humidity', label: insightsCopy.humidity, value: humidity },
    { key: 'pressure', label: insightsCopy.pressure, value: pressure },
    { key: 'sunrise', label: insightsCopy.sunrise, value: sunrise },
    { key: 'sunset', label: insightsCopy.sunset, value: sunset },
    { key: 'uv', label: insightsCopy.uv, value: uvIndex }
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(59,130,246,0.2),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,_rgba(15,23,42,0.6),_rgba(2,6,23,0.95))]" />
        </div>
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-32 pb-16 text-center">
          <p className="text-xs uppercase tracking-[0.5em] text-sky-200">{heroCopy.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-serif font-bold leading-tight text-white sm:text-5xl">
            {heroCopy.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-200">
            {heroCopy.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <WeatherBadge endpoint="/api/weather" initialData={snapshot} className="pointer-events-none shadow-lg shadow-sky-900/40" />
          </div>
          <p className="mt-5 text-sm text-slate-300">
            {(widgetLabels?.updatedAtPrefix ?? 'Updated')} {updatedStamp}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-semibold">
            <Link
              href={`/${safeLang}`}
              className="rounded-full border border-white/20 px-4 py-2 text-slate-200 transition hover:border-white hover:text-white"
            >
              {heroCopy.back}
            </Link>
            <a
              href="#alerts"
              className="rounded-full border border-sky-400/40 px-4 py-2 text-sky-200 transition hover:border-sky-300 hover:text-white"
            >
              {heroCopy.alertsLink}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-[32px] border border-white/5 bg-white/5 p-6 backdrop-blur">
          <WeatherWidget endpoint="/api/weather" initialData={snapshot} labels={widgetLabels} dateLocale={locale} />
        </div>
      </section>

      <section id="alerts" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-800/90 p-8 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-sky-200">{heroCopy.badge}</p>
              <h2 className="mt-2 text-3xl font-serif font-bold">{alertsCopy.title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">{alertsCopy.subtitle}</p>
            </div>
            <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
              {snapshot.alerts.length} / 24h
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {snapshot.alerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-slate-200">
                {alertsCopy.empty}
              </div>
            ) : (
              snapshot.alerts.map((alert) => (
                <article
                  key={`${alert.event}-${alert.start}-${alert.end}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-200">
                      {alertsCopy.badge}
                    </span>
                    <p className="text-base font-semibold text-white">{alert.event}</p>
                  </div>
                  <p className="mt-3 text-slate-200">{alert.description ?? '—'}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
                    <span>{alertDuration(alert.start, alert.end)}</span>
                    {alert.sender ? (
                      <span>
                        {alertsCopy.source}: {alert.sender}
                      </span>
                    ) : null}
                    <span>{alertImpact(snapshot.thresholdWindKmh)}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.4em] text-sky-200">{heroCopy.badge}</p>
            <h2 className="text-3xl font-serif font-bold text-white">{insightsCopy.title}</h2>
            <p className="text-sm text-slate-200">{insightsCopy.subtitle}</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {insights.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-center shadow-inner">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
