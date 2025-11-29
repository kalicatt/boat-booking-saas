import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientStatsPage from './ClientPage'

type AdminStatsUser = {
  role?: string | null
  email?: string | null
  id?: string | null
}

export default async function StatsPage() {
  const session = await auth()
  const user = (session?.user ?? null) as AdminStatsUser | null
  const role = typeof user?.role === 'string' ? user.role : null

  if (!user) {
    redirect('/login')
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    await createLog(
      'UNAUTHORIZED_STATS',
      `User ${user?.email || user?.id || 'unknown'} with role ${role ?? 'unknown'} attempted /admin/stats`
    )
    redirect('/admin')
  }

  return <ClientStatsPage />
}