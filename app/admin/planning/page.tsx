import ClientPlanningPage from './ClientPage'
import { ensureAdminPageAccess, canPerformAdminAction } from '@/lib/adminAccess'

export default async function PlanningPage() {
  const { role, permissions } = await ensureAdminPageAccess({ page: 'planning', auditEvent: 'UNAUTHORIZED_PLANNING' })
  const canOverrideLockedDays =
    role === 'ADMIN' ||
    role === 'SUPERADMIN' ||
    canPerformAdminAction(role, permissions, 'planning', 'edit')

  return <ClientPlanningPage canOverrideLockedDays={canOverrideLockedDays} />
}