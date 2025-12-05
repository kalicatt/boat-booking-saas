import FleetClientPage from './FleetClientPage'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function FleetPage() {
  await ensureAdminPageAccess({ page: 'fleet', auditEvent: 'UNAUTHORIZED_FLEET' })
  return <FleetClientPage />
}
