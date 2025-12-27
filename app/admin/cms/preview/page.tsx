import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import { getCmsPreviewPayload } from '@/lib/cms/preview'
import { AdminPageShell } from '@/app/admin/_components/AdminPageShell'
import { CmsPreviewClient } from './CmsPreviewClient'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type LocaleCode } from '@/types/cms'
import {
  SUPPORTED_LOCALES as PUBLIC_SUPPORTED_LOCALES,
  type SupportedLocale
} from '@/lib/get-dictionary'

const isAdminRole = (role: string | null | undefined) =>
  role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'

type SearchParamInput = URLSearchParams | Record<string, string | string[] | undefined>

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const resolveLangParam = (params?: Record<string, string | string[] | undefined>): string | null => {
  if (!params) return null
  const value = params.lang
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return typeof value === 'string' ? value : null
}

const DEFAULT_PREVIEW_LANG: SupportedLocale = 'fr'

export default async function CmsPreviewPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const session = await auth()
  const user = session?.user ?? null

  if (!user || typeof user.id !== 'string') {
    redirect('/login')
  }

  const role = typeof user.role === 'string' ? user.role : null

  if (!isAdminRole(role)) {
    const identifier = user.email ?? user.id ?? 'unknown'
    await createLog(
      'UNAUTHORIZED_CMS_PREVIEW',
      `User ${identifier} with role ${role ?? 'unknown'} attempted /admin/cms/preview`
    )
    redirect('/admin')
  }

  const requestedLocale = resolveLangParam(resolvedSearchParams)
  const initialLocale = SUPPORTED_LOCALES.includes(requestedLocale as LocaleCode)
    ? (requestedLocale as LocaleCode)
    : DEFAULT_LOCALE

  const fallbackPreviewLang = PUBLIC_SUPPORTED_LOCALES.includes(initialLocale as SupportedLocale)
    ? (initialLocale as SupportedLocale)
    : DEFAULT_PREVIEW_LANG

  const previewLang: SupportedLocale =
    requestedLocale && PUBLIC_SUPPORTED_LOCALES.includes(requestedLocale as SupportedLocale)
      ? (requestedLocale as SupportedLocale)
      : fallbackPreviewLang

  const immersivePreviewHref = `/admin/cms/preview/full?lang=${previewLang}`

  const data = await getCmsPreviewPayload()

  return (
    <AdminPageShell
      title="Prévisualisation du site"
      description="Contrôlez les contenus en brouillon avant publication."
      backHref="/admin"
      actions={
        <Link
          href={immersivePreviewHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Voir la version immersive
          <span aria-hidden="true">↗</span>
        </Link>
      }
    >
      <CmsPreviewClient initialData={data} initialLocale={initialLocale} />
    </AdminPageShell>
  )
}
