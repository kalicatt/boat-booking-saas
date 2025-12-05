import ClientPage from './ClientPage'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function BlocksAdminPage() {
  await ensureAdminPageAccess({ page: 'blocks', auditEvent: 'UNAUTHORIZED_BLOCKS' })
  return <ClientPage />
}
