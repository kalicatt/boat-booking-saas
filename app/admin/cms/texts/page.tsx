import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import { getSiteConfigGroups } from '@/lib/cms/siteConfig'
import { TextsSeoManagerClient } from './TextsSeoManagerClient'

const isAdminRole = (role: string | null | undefined) =>
  role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'

export default async function TextsSeoPage() {
  const session = await auth()
  const user = session?.user ?? null

  if (!user || typeof user.id !== 'string') {
    redirect('/login')
  }

  const role = typeof user.role === 'string' ? user.role : null

  if (!isAdminRole(role)) {
    const identifier = user.email ?? user.id ?? 'unknown'
    await createLog(
      'UNAUTHORIZED_CMS_TEXTS',
      `User ${identifier} with role ${role ?? 'unknown'} attempted /admin/cms/texts`
    )
    redirect('/admin')
  }

  const groups = await getSiteConfigGroups()

  return <TextsSeoManagerClient initialGroups={groups} />
}
