import ClientPage from './ClientPage'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function AccountingAdminPage() {
  await ensureAdminPageAccess({ page: 'accounting', auditEvent: 'UNAUTHORIZED_ACCOUNTING' })
  return <ClientPage />
}
