import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientPlanningPage from './ClientPage'

type AdminSessionUser = {
  id?: string | null
  email?: string | null
  role?: string | null
}

export default async function PlanningPage() {
  const session = await auth()
  const user = (session?.user ?? null) as AdminSessionUser | null

  if (!user || typeof user.id !== 'string') {
    redirect('/login')
  }

  const role = typeof user.role === 'string' ? user.role : null
  const isAuthorized = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'

  if (!isAuthorized) {
    const identifier = user.email ?? user.id ?? 'unknown'
    await createLog(
      'UNAUTHORIZED_PLANNING',
      `User ${identifier} with role ${role ?? 'unknown'} attempted /admin/planning`
    )
    redirect('/admin')
  }

  const canOverrideLockedDays = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'

  return <ClientPlanningPage canOverrideLockedDays={canOverrideLockedDays} />
}