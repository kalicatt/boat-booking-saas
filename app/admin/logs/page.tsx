import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientLogsPage from './ClientPage'

export default async function LogsPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role

  if (!user) {
    redirect('/login')
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    await createLog(
      'UNAUTHORIZED_LOGS',
      `User ${user?.email || user?.id || 'unknown'} with role ${role} attempted /admin/logs`
    )
    redirect('/admin')
  }

  return <ClientLogsPage />
}