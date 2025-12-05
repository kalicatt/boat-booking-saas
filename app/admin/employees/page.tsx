import ClientEmployeesPage from './ClientPage'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function EmployeesPage() {
  const { role } = await ensureAdminPageAccess({ page: 'employees', auditEvent: 'UNAUTHORIZED_EMPLOYEES' })
  const canManage = role === 'ADMIN' || role === 'SUPERADMIN'
  return <ClientEmployeesPage canManage={canManage} />
}