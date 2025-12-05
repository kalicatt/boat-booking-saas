import ClientPage from './ClientPage'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function TodayPage() {
  await ensureAdminPageAccess({ page: 'today', auditEvent: 'UNAUTHORIZED_TODAY' })
  return <ClientPage />
}