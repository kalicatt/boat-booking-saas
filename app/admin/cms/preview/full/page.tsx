import clsx from 'clsx'
import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import { getCmsPreviewPayload } from '@/lib/cms/preview'
import LandingClient from '@/components/LandingClient'
import {
  DEFAULT_LOCALE as CMS_DEFAULT_LOCALE,
  SUPPORTED_LOCALES as CMS_SUPPORTED_LOCALES,
  type LocaleCode
} from '@/types/cms'
import {
  getDictionary,
  SUPPORTED_LOCALES as PUBLIC_SUPPORTED_LOCALES,
  type SupportedLocale
} from '@/lib/get-dictionary'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'

const isAdminRole = (role: string | null | undefined) =>
  role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'

const FALLBACK_LOCALE: SupportedLocale = 'fr'

type PageProps = {
  searchParams?: { lang?: string }
}

export default async function CmsFullPreviewPage({ searchParams }: PageProps) {
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
      `User ${identifier} with role ${role ?? 'unknown'} attempted /admin/cms/preview/full`
    )
    redirect('/admin')
  }

  const requestedLocale = typeof searchParams?.lang === 'string' ? (searchParams.lang as string) : null
  const safeLocale: SupportedLocale =
    requestedLocale && PUBLIC_SUPPORTED_LOCALES.includes(requestedLocale as SupportedLocale)
      ? (requestedLocale as SupportedLocale)
      : FALLBACK_LOCALE

  const dict = getDictionary(safeLocale)
  const cmsLocale: LocaleCode = CMS_SUPPORTED_LOCALES.includes(safeLocale as LocaleCode)
    ? (safeLocale as LocaleCode)
    : CMS_DEFAULT_LOCALE
  const cmsPayload = await getCmsPreviewPayload()

  return (
    <div className="relative min-h-screen bg-slate-900">
      <LandingClient
        dict={dict}
        lang={safeLocale}
        cmsContent={cmsPayload}
        initialCmsLocale={cmsLocale}
      />

      <div className="pointer-events-none fixed bottom-6 left-6 z-[70] flex flex-col gap-3">
        <Link
          href="/admin/cms/preview"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:border-white/60 hover:bg-white/20"
        >
          <span aria-hidden="true">←</span>
          Retour à l&apos;admin
        </Link>

        <div className="pointer-events-auto flex overflow-hidden rounded-full border border-white/30 bg-white/10 text-xs font-semibold uppercase tracking-[0.2em]">
          {PUBLIC_SUPPORTED_LOCALES.map((code) => (
            <Link
              key={code}
              prefetch={false}
              href={`/admin/cms/preview/full?lang=${code}`}
              className={clsx(
                'px-3 py-1.5 transition',
                safeLocale === code ? 'bg-white text-slate-900' : 'text-white/70 hover:bg-white/10'
              )}
            >
              {code.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
