import ClientLogsPage from './ClientPage'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function LogsPage() {
  await ensureAdminPageAccess({ page: 'logs', auditEvent: 'UNAUTHORIZED_LOGS' })
  return <ClientLogsPage />
}