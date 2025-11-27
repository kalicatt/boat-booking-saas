import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientStatsPage from './ClientPage'

export default async function StatsPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role

  if (!user) {
    redirect('/login')
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    await createLog(
      'UNAUTHORIZED_STATS',
      `User ${user?.email || user?.id || 'unknown'} with role ${role} attempted /admin/stats`
    )
    redirect('/admin')
  }

  return <ClientStatsPage />
}