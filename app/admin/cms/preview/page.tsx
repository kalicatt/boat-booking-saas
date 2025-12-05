import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import { getCmsPreviewPayload } from '@/lib/cms/preview'
import { AdminPageShell } from '@/app/admin/_components/AdminPageShell'
import { CmsPreviewClient } from './CmsPreviewClient'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type LocaleCode } from '@/types/cms'

const isAdminRole = (role: string | null | undefined) =>
  role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'

type PageProps = {
  searchParams?: { lang?: string }
}

export default async function CmsPreviewPage({ searchParams }: PageProps) {
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

  const requestedLocale = typeof searchParams?.lang === 'string' ? (searchParams.lang as string) : null
  const initialLocale = SUPPORTED_LOCALES.includes(requestedLocale as LocaleCode)
    ? (requestedLocale as LocaleCode)
    : DEFAULT_LOCALE

  const data = await getCmsPreviewPayload()

  return (
    <AdminPageShell
      title="Prévisualisation du site"
      description="Contrôlez les contenus en brouillon avant publication."
      backHref="/admin"
    >
      <CmsPreviewClient initialData={data} initialLocale={initialLocale} />
    </AdminPageShell>
  )
}
