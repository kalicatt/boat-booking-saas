'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import type { CmsPreviewPayload } from '@/lib/cms/preview'
import { SITE_CONFIG_GROUPS } from '@/lib/cms/siteConfigDefinitions'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type LocaleCode,
  type TranslationRecord
} from '@/types/cms'

const resolveTranslation = (value: TranslationRecord, locale: LocaleCode): string => {
  const direct = value[locale]
  if (direct && direct.trim().length) {
    return direct
  }
  const fallback = value[DEFAULT_LOCALE]
  if (fallback && fallback.trim().length) {
    return fallback
  }
  for (const code of SUPPORTED_LOCALES) {
    const candidate = value[code]
    if (candidate && candidate.trim().length) {
      return candidate
    }
  }
  return ''
}

const resolveFieldValue = (value: TranslationRecord | string, locale: LocaleCode): string => {
  if (typeof value === 'string') {
    return value
  }
  return resolveTranslation(value, locale)
}

type CmsPreviewClientProps = {
  initialData: CmsPreviewPayload
  initialLocale: LocaleCode
}

export function CmsPreviewClient({ initialData, initialLocale }: CmsPreviewClientProps) {
  const [locale, setLocale] = useState<LocaleCode>(initialLocale)

  const siteConfigMap = useMemo(() => {
    return new Map(initialData.siteConfig.map((entry) => [entry.key, entry.value]))
  }, [initialData.siteConfig])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Preview</p>
            <p className="text-lg font-semibold text-slate-900">
              Version brouillon — langue {locale.toUpperCase()}
            </p>
            <p className="text-sm text-slate-500">
              Les contenus affiches ci-dessous proviennent des brouillons en attente de publication.
            </p>
          </div>
          <div className="flex overflow-hidden rounded-full border border-slate-200">
            {SUPPORTED_LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-semibold uppercase tracking-wide',
                  locale === code ? 'bg-slate-900 text-white' : 'text-slate-500'
                )}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-lg">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Hero</p>
            <p className="text-2xl font-semibold">Carrousel d&apos;accueil</p>
          </div>
          <span className="text-sm text-slate-400">{initialData.heroSlides.length} slides</span>
        </header>
        {initialData.heroSlides.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {initialData.heroSlides.map((slide) => (
              <article
                key={slide.id}
                className={clsx(
                  'relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5',
                  !slide.isActive && 'opacity-60'
                )}
              >
                <div
                  className="mb-4 h-40 rounded-2xl border border-white/10 bg-cover bg-center"
                  style={{ backgroundImage: `url(${slide.imageDesktop})` }}
                />
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Slide #{slide.order + 1}</p>
                <p className="text-xl font-semibold leading-tight">
                  {resolveTranslation(slide.title, locale) || 'Titre manquant'}
                </p>
                <p className="text-sm text-slate-300">
                  {resolveTranslation(slide.subtitle, locale) || 'Sous-titre non defini'}
                </p>
                {!slide.isActive ? (
                  <span className="mt-3 inline-flex items-center rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-100">
                    Masquée
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-300">Aucune slide enregistrée.</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Partenaires</p>
            <p className="text-xl font-semibold text-slate-900">Logos affichés sur le site</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{initialData.partners.length} entrées</span>
        </header>
        {initialData.partners.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {initialData.partners.map((partner) => (
              <article
                key={partner.id}
                className={clsx(
                  'flex flex-col gap-3 rounded-2xl border px-4 py-5 text-sm transition',
                  partner.isVisible
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-dashed border-rose-200 bg-white text-slate-400'
                )}
              >
                <div className="flex h-20 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <div
                    className="h-12 w-28 bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${partner.logoUrl})` }}
                  />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{partner.name}</p>
                  <p className="text-xs text-slate-500">Ordre #{partner.order + 1}</p>
                </div>
                {!partner.isVisible ? (
                  <span className="inline-flex items-center rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600">
                    Caché
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucun partenaire en brouillon.</p>
        )}
      </section>

      <section className="space-y-6">
        {SITE_CONFIG_GROUPS.map((group) => (
          <article key={group.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                {group.description ? (
                  <p className="text-xs text-slate-500">{group.description}</p>
                ) : null}
              </div>
            </header>
            <div className="space-y-5">
              {group.fields.map((field) => {
                const rawValue = siteConfigMap.get(field.key)
                const previewValue = rawValue ? resolveFieldValue(rawValue, locale) : ''
                const isRichText = field.type === 'rich_text'
                return (
                  <div key={field.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {field.label}
                    </p>
                    {field.helperText ? (
                      <p className="text-xs text-slate-400">{field.helperText}</p>
                    ) : null}
                    {previewValue ? (
                      isRichText ? (
                        <div
                          className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800"
                          dangerouslySetInnerHTML={{ __html: previewValue }}
                        />
                      ) : (
                        <p className="mt-3 text-sm text-slate-800">{previewValue}</p>
                      )
                    ) : (
                      <p className="mt-3 text-sm italic text-slate-400">Non renseigné.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
