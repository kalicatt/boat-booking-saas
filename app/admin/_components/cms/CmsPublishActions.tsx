'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Eye, Rocket, Loader2 } from 'lucide-react'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type LocaleCode } from '@/types/cms'

type CmsPublishActionsProps = {
  className?: string
}

type BannerState = { type: 'success' | 'error'; text: string } | null

export function CmsPublishActions({ className }: CmsPublishActionsProps) {
  const [locale, setLocale] = useState<LocaleCode>(DEFAULT_LOCALE)
  const [banner, setBanner] = useState<BannerState>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePreview = () => {
    const url = `/admin/cms/preview?lang=${locale}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    setBanner(null)
    try {
      const response = await fetch('/api/admin/cms/publish', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error ?? 'Publication impossible.')
      }
      setBanner({ type: 'success', text: 'Contenu publié sur le site.' })
    } catch (error) {
      setBanner({
        type: 'error',
        text: error instanceof Error ? error.message : 'Echec lors de la publication.'
      })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-full border border-slate-200">
          {SUPPORTED_LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={clsx(
                'px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                locale === code ? 'bg-slate-900 text-white' : 'text-slate-500'
              )}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handlePreview}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
        >
          <Eye className="h-3.5 w-3.5" />
          Prévisualiser
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing}
          className={clsx(
            'inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm',
            isPublishing && 'opacity-70'
          )}
        >
          {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
          {isPublishing ? 'Publication…' : 'Publier' }
        </button>
      </div>
      {banner ? (
        <p
          className={clsx(
            'text-xs',
            banner.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
          )}
        >
          {banner.text}
        </p>
      ) : null}
    </div>
  )
}
