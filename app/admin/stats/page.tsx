import ClientStatsPage from './ClientPage'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function StatsPage() {
  await ensureAdminPageAccess({ page: 'stats', auditEvent: 'UNAUTHORIZED_STATS' })
  return <ClientStatsPage />
}