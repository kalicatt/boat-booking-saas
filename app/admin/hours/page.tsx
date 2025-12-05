import ClientHoursPage from './ClientPage'
import { ensureAdminPageAccess, canPerformAdminAction } from '@/lib/adminAccess'

export default async function HoursPage() {
  const { role, permissions } = await ensureAdminPageAccess({ page: 'hours', auditEvent: 'UNAUTHORIZED_HOURS' })
  const canManage =
    role === 'ADMIN' ||
    role === 'SUPERADMIN' ||
    canPerformAdminAction(role, permissions, 'hours', 'approve')
  const ownOnly = !canManage

  return <ClientHoursPage canManage={canManage} ownOnly={ownOnly} />
}