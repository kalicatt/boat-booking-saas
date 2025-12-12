"use client"

import { useMemo } from 'react'
import clsx from 'clsx'

export type PdfViewerProps = {
  src: string
  title?: string
  fileName?: string
  className?: string
  hint?: string
}

export function PdfViewer({ src, title, fileName, className, hint }: PdfViewerProps) {
  const displayTitle = title ?? fileName ?? 'Aperçu PDF'

  const iframeTitle = useMemo(() => {
    if (displayTitle) return displayTitle
    return 'PDF preview'
  }, [displayTitle])

  return (
    <div className={clsx('relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner', className)}>
      <iframe
        title={iframeTitle}
        src={src}
        className="h-80 w-full"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] font-semibold text-slate-500">
        <span>{displayTitle}</span>
        <span>{hint ?? 'Lien sécurisé · lecture seule'}</span>
      </div>
    </div>
  )
}
