import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientPlanningPage from './ClientPage'

export default async function PlanningPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role

  if (!user) {
    redirect('/login')
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    await createLog(
      'UNAUTHORIZED_PLANNING',
      `User ${user?.email || user?.id || 'unknown'} with role ${role} attempted /admin/planning`
    )
    redirect('/admin')
  }

  return <ClientPlanningPage />
}