'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { WeatherBadge } from './WeatherBadge'

interface AdminPageShellProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  backHref?: string
  backLabel?: string
  footerNote?: string
}

export function AdminPageShell({
  title,
  description,
  actions,
  children,
  backHref = '/admin',
  backLabel = 'Retour au tableau de bord',
  footerNote
}: AdminPageShellProps) {
  return (
    <div className="flex min-h-full flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-bold text-slate-900">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WeatherBadge />
          {actions}
        </div>
      </header>

      <div className="flex-1 space-y-6">{children}</div>

      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Sweet Narcisse · Interface administration</span>
        {footerNote ? <span className="text-slate-400">{footerNote}</span> : <span />}
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-slate-500 transition hover:text-slate-800"
        >
          <span aria-hidden="true">↩</span>
          Retour à l&apos;accueil admin
        </Link>
      </footer>
    </div>
  )
}
