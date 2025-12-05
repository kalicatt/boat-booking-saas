'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import type { LocaleCode, TranslationRecord } from '@/types/cms'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/types/cms'

type TranslatableInputProps = {
  label: string
  value: TranslationRecord
  onChange: (value: TranslationRecord) => void
  locales?: LocaleCode[]
  requiredLocale?: LocaleCode
  helperText?: string
  multiline?: boolean
  rows?: number
}

const localeLabels: Record<LocaleCode, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch'
}

const localeBadges: Record<LocaleCode, string> = {
  fr: 'FR',
  en: 'EN',
  de: 'DE'
}

export function TranslatableInput({
  label,
  value,
  onChange,
  locales = [...SUPPORTED_LOCALES],
  requiredLocale = DEFAULT_LOCALE,
  helperText,
  multiline = false,
  rows = 4
}: TranslatableInputProps) {
  const safeLocales = useMemo(() => (locales.length ? locales : [DEFAULT_LOCALE]), [locales])
  const [activeLocale, setActiveLocale] = useState<LocaleCode>(safeLocales[0] ?? DEFAULT_LOCALE)

  const handleInput = (locale: LocaleCode, nextValue: string) => {
    onChange({ ...value, [locale]: nextValue })
  }

  const renderControl = (locale: LocaleCode) => {
    const localeValue = value[locale] ?? ''
    const baseClasses = 'w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400'
    if (multiline) {
      return (
        <textarea
          className={clsx(baseClasses, 'min-h-[120px]')}
          rows={rows}
          value={localeValue}
          onChange={(event) => handleInput(locale, event.target.value)}
          placeholder={`Texte (${localeLabels[locale]})`}
        />
      )
    }
    return (
      <input
        className={baseClasses}
        value={localeValue}
        onChange={(event) => handleInput(locale, event.target.value)}
        placeholder={`Texte (${localeLabels[locale]})`}
      />
    )
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
        </div>
        <nav className="flex flex-wrap gap-2">
          {safeLocales.map((locale) => {
            const isActive = activeLocale === locale
            return (
              <button
                key={locale}
                type="button"
                onClick={() => setActiveLocale(locale)}
                className={clsx(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition',
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                )}
              >
                <span className="mr-1 inline-flex h-4 w-6 items-center justify-center rounded bg-slate-800 text-[10px] text-white">
                  {localeBadges[locale]}
                </span>
                {locale.toUpperCase()}
                {locale === requiredLocale ? '*' : ''}
              </button>
            )
          })}
        </nav>
      </header>
      {renderControl(activeLocale)}
    </section>
  )
}
